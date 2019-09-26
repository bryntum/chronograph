import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { NOT_VISITED, OnCycleAction, VisitInfo, WalkContext, WalkStep } from "../graph/WalkDepth.js"
import {
    CalculationContext,
    runGeneratorAsyncWithEffect,
    runGeneratorSyncWithEffect,
    SynchronousCalculationStarted
} from "../primitives/Calculation.js"
import { LeveledStack } from "../util/LeveledStack.js"
import { PropagateArguments } from "./Checkout.js"
import { Effect, ProposedOrCurrentSymbol, TransactionSymbol, WriteEffect, WriteSeveralEffect, WriteSeveralSymbol, WriteSymbol } from "./Effect.js"
import { Identifier, throwUnknownIdentifier } from "./Identifier.js"
import { QuarkEntry, TombStone } from "./QuarkEntry.js"
import { MinimalRevision, Revision } from "./Revision.js"


//---------------------------------------------------------------------------------------------------------------------
export type NotPromise<T> = T extends Promise<any> ? never : T

export type SyncEffectHandler = <T extends any>(effect : YieldableValue) => T & NotPromise<T>
export type AsyncEffectHandler = <T extends any>(effect : YieldableValue) => Promise<T>


//---------------------------------------------------------------------------------------------------------------------
export class WalkForwardOverwriteContext extends WalkContext<Identifier> {
    visited         : Map<Identifier, QuarkEntry>

    baseRevision    : Revision

    pushTo          : LeveledStack<QuarkEntry>


    setVisitedInfo (identifier : Identifier, visitedAt : number, entry : QuarkEntry) : VisitInfo {
        if (!entry) {
            entry      = identifier.quarkClass.new({ identifier })

            this.visited.set(identifier, entry)
        }

        entry.visitedAt    = visitedAt
        entry.visitEpoch   = this.currentEpoch

        return entry
    }


    onTopologicalNode (identifier : Identifier) {
        if (!identifier.lazy) this.pushTo.push(this.visited.get(identifier))
    }


    onCycle (node : Identifier, stack : WalkStep<Identifier>[]) : OnCycleAction {
        return OnCycleAction.Resume
    }


    collectNext (node : Identifier, toVisit : WalkStep<Identifier>[], visitInfo : QuarkEntry) {
        const entry             = this.baseRevision.getLatestEntryFor(node)

        // newly created identifier
        if (!entry) return

        // since `collectNext` is called exactly once for every node, all nodes (which are transitions)
        // will have the `previous` property populated
        visitInfo.previous      = entry

        if (node.lazy && entry.origin && entry.origin.usedProposedOrCurrent) {
            // for lazy quarks, that depends on the `ProposedOrCurrent` effect, we need to save the value or proposed value
            // from the previous revision
            // this is because that, for "historyLimit = 1", the previous revision's data will be completely overwritten by the new one
            // so general consideration is - the revision should contain ALL information needed to calculate it
            // alternatively, this could be done during the `populateCandidateScopeFromTransitions`
            visitInfo.getQuark().proposedValue   = entry.origin.value
        }

        if (entry.outgoing) {
            for (const outgoingEntry of entry.outgoing) {
                const identifier    = outgoingEntry.identifier

                if (outgoingEntry.origin !== this.baseRevision.getLatestEntryFor(identifier).origin) continue

                let entry : QuarkEntry              = this.visited.get(identifier)

                if (!entry) {
                    entry                           = identifier.quarkClass.new({ identifier })

                    this.visited.set(identifier, entry)
                }

                if (entry.visitEpoch < this.currentEpoch) {
                    entry.visitEpoch    = this.currentEpoch
                    entry.visitedAt     = NOT_VISITED
                    entry.edgesFlow     = 0

                    entry.cleanupCalculation()
                    if (entry.outgoing) entry.outgoing.clear()
                    if (entry.origin && entry.origin === entry) entry.origin.value = undefined
                }

                entry.edgesFlow++

                toVisit.push({ node : identifier, from : node, label : undefined })
            }
        }

        if (visitInfo.outgoing) {
            for (const outgoingEntry of visitInfo.outgoing) {
                const identifier    = outgoingEntry.identifier

                let entry : QuarkEntry              = this.visited.get(identifier)

                if (!entry) throw new Error('Should not happen')

                if (entry.visitEpoch < this.currentEpoch) {
                    entry.visitEpoch    = this.currentEpoch
                    entry.visitedAt     = NOT_VISITED
                    entry.edgesFlow     = 0

                    entry.cleanupCalculation()
                    if (entry.outgoing) entry.outgoing.clear()
                    if (entry.origin && entry.origin === entry) entry.origin.value = undefined
                }

                entry.edgesFlow++

                toVisit.push({ node : identifier, from : node, label : undefined })
            }
        }
    }
}


//---------------------------------------------------------------------------------------------------------------------
export type YieldableValue = Effect | Identifier


//---------------------------------------------------------------------------------------------------------------------
export const Transaction = <T extends AnyConstructor<Base>>(base : T) =>

class Transaction extends base {
    baseRevision            : Revision

    isClosed                : boolean               = false

    walkContext             : WalkForwardOverwriteContext

    // we use 2 different stacks, because they support various effects
    stackSync               : LeveledStack<QuarkEntry>  = new LeveledStack()
    // the `stackGen` supports async effects notably
    stackGen                : LeveledStack<QuarkEntry>  = new LeveledStack()

    candidate               : Revision

    onEffectSync            : SyncEffectHandler


    initialize (...args) {
        super.initialize(...args)

        this.walkContext    = WalkForwardOverwriteContext.new({
            baseRevision    : this.baseRevision,
            pushTo          : this.stackGen
            // // ignore cycles when determining potentially changed atoms
            // onCycle         : (quark : Identifier, stack : WalkStep<Identifier>[]) => OnCycleAction.Resume,
            //
            // onTopologicalNode       : (identifier : Identifier) => {
            //     if (!identifier.lazy) this.stackGen.push(this.entries.get(identifier))
            // }
        })

        if (!this.candidate) this.candidate = MinimalRevision.new({ previous : this.baseRevision })

        // the `onEffectSync` should be bound to the `yieldSync` of course, and `yieldSync` should look like:
        //     yieldSync (effect : YieldableValue) : any {
        //         if (effect instanceof Identifier) return this.read(effect)
        //     }
        // however, the latter consumes more stack frames - every read goes through `yieldSync`
        // since `read` is the most used effect anyway, we bind `onEffectSync` to `read` and
        // instead inside of `read` delegate to `yieldSync` for non-identifiers
        this.onEffectSync   = this.read.bind(this)
    }


    get entries () : Map<Identifier, QuarkEntry> {
        return this.walkContext.visited
    }


    isEmpty () : boolean {
        return this.entries.size === 0
    }


    getActiveEntry () : QuarkEntry {
        // `stackSync` is always empty, except when the synchronous "batch" is being processed
        const activeStack   = this.stackSync.length > 0 ? this.stackSync : this.stackGen

        return activeStack.last()
    }


    // async yieldAsync (effect : Effect) : Promise<any> {
    //     return this[ effect.handler ](effect, this.getActiveEntry())
    // }


    // see the comment for the `onEffectSync`
    yieldSync (effect : Effect) : any {
        return this[ effect.handler ](effect, this.getActiveEntry())
    }


    // TODO merge into `yieldSync` ??
    read (identifier : Identifier) : any {
        // see the comment for the `onEffectSync`
        if (!(identifier instanceof Identifier)) return this.yieldSync(identifier as Effect)

        //----------------------
        let entry           = this.entries.get(identifier)

        if (!entry) {
            const latestEntry       = this.baseRevision.getLatestEntryFor(identifier)

            if (!latestEntry) throwUnknownIdentifier(identifier)

            entry                   = identifier.quarkClass.new({ identifier, origin : latestEntry.origin })

            this.entries.set(identifier, entry)
        }

        //----------------------
        const activeEntry   = this.getActiveEntry()

        if (activeEntry.identifier.level < entry.identifier.level) throw new Error('Identifier can not read from higher level identifier')

        entry.getOutgoing().add(activeEntry)

        //----------------------
        if (entry.hasValue()) return entry.getValue()

        //----------------------
        entry.forceCalculation()

        this.stackSync.push(entry)

        this.calculateTransitionsStackSync(this.onEffectSync, this.stackSync)

        if (!entry.hasValue()) throw new Error('Cycle during synchronous computation')

        return entry.getValue()
    }


    acquireQuark<T extends Identifier> (identifier : T) : InstanceType<T[ 'quarkClass' ]> {
        return this.touch(identifier).getQuark() as InstanceType<T[ 'quarkClass' ]>
    }


    acquireQuarkIfExists<T extends Identifier> (identifier : T) : InstanceType<T[ 'quarkClass' ]> | undefined {
        const entry     = this.entries.get(identifier)

        return entry && entry.origin === entry ? entry.origin as InstanceType<T[ 'quarkClass' ]> : undefined
    }


    touch (identifier : Identifier) : QuarkEntry {
        this.walkContext.continueFrom([ identifier ])

        const entry                 = this.entries.get(identifier)

        entry.forceCalculation()

        return entry
    }


    removeIdentifier (identifier : Identifier) {
        const entry                 = this.touch(identifier)

        entry.acquireQuark().value  = TombStone
    }


    populateCandidateScopeFromTransitions (candidate : Revision, entries : Map<Identifier, QuarkEntry>) {
        if (candidate.scope.size === 0) {
            // in this branch we can overwrite the whole map
            candidate.scope     = entries

            // its important to clear the transitions, since that reduces garbage collection workload
            // (improves the `benchmark_sync` significantly)
            // we do it manually, right after the calculation of every quark completes
            // so strictly speaking this code is not needed, but, it definitely feels, like
            // it improves the `benchmark_sync`
            // perhaps, because all `entries` are accessed sequentially, they are cached in some internal CPU caches
            // for (const entry of entries.values()) {
            //     // this code can be uncommented to check if we leak transitions somewhere
            //     // if (entry.transition) debugger
            //
            //     entry.transition    = undefined
            // }
        } else {
            // in this branch candidate's scope already has some content - this is the case for calculating lazy values


            // // TODO benchmark what is faster (for small maps) - `map.forEach(entry => {})` or `for (const entry of map) {}`
            // entries.forEach((entry : QuarkEntry, identifier : Identifier) => {
            //     candidate.scope.set(identifier, entry)
            //
            //     entry.transition    = null
            // })

            for (const [ identifier, entry ] of entries) {
                candidate.scope.set(identifier, entry)

                // entry.transition    = undefined
            }
        }
    }


    prePropagate (args? : PropagateArguments) : LeveledStack<QuarkEntry> {
        if (this.isClosed) throw new Error('Can not propagate closed revision')

        let stack : LeveledStack<QuarkEntry>

        if (args && args.calculateOnly) {
            const calculateOnly     = args.calculateOnly

            // TODO should probably calculate the identifiers from `calculateOnly`, PLUS all identifiers
            // of the lower levels from `this.stackGen`, needs test
            stack                   = new LeveledStack()
            stack.levels[ 0 ]       = calculateOnly.map(identifier => this.entries.get(identifier))
            stack.length            = calculateOnly.length

        } else
            stack                   = this.stackGen

        this.isClosed   = true

        for (const selfDependentQuark of this.baseRevision.selfDependentQuarks) this.touch(selfDependentQuark)

        return stack
    }


    postPropagate () : Revision {
        this.populateCandidateScopeFromTransitions(this.candidate, this.entries)

        // for some reason need to cleanup the `walkContext` manually, otherwise the extra revisions hangs in memory
        this.walkContext            = undefined

        return this.candidate
    }


    propagate (args? : PropagateArguments) : Revision {
        const stack = this.prePropagate(args)

        runGeneratorSyncWithEffect(this.onEffectSync, this.calculateTransitionsStackGen, [ this.onEffectSync, stack ], this)

        return this.postPropagate()
    }


    // propagation that does not use generators at all
    propagateSync (args? : PropagateArguments) : Revision {
        const stack = this.prePropagate(args)

        this.calculateTransitionsStackSync(this.onEffectSync, stack)

        return this.postPropagate()
    }


    async propagateAsync (args? : PropagateArguments) : Promise<Revision> {
        const stack = this.prePropagate(args)

        // TODO should check the `async` flag of the effect and do not do `await` if not needed
        await runGeneratorAsyncWithEffect(this.onEffectSync, this.calculateTransitionsStackGen, [ this.onEffectSync, stack ], this)

        return this.postPropagate()
    }


    [ProposedOrCurrentSymbol] (effect : Effect, activeEntry : QuarkEntry) : any {
        const quark             = activeEntry.getQuark()

        quark.usedProposedOrCurrent      = true

        const proposedValue     = quark.proposedValue

        if (proposedValue !== undefined) return proposedValue

        const baseRevision      = this.baseRevision
        const identifier        = activeEntry.identifier
        const latestEntry       = baseRevision.getLatestEntryFor(identifier)

        if (latestEntry === activeEntry) {
            return baseRevision.previous ? baseRevision.previous.read(identifier) : undefined
        } else {
            return latestEntry ? baseRevision.read(identifier) : null
        }
    }


    [TransactionSymbol] (effect : Effect, activeEntry : QuarkEntry) : any {
        return this
    }


    [WriteSymbol] (effect : WriteEffect, activeEntry : QuarkEntry) : any {
        if (activeEntry.identifier.lazy) throw new Error('Lazy identifiers can not use `Write` effect')

        this.walkContext.currentEpoch++

        effect.writeTarget.write(this, ...effect.proposedArgs)
    }


    [WriteSeveralSymbol] (effect : WriteSeveralEffect, activeEntry : QuarkEntry) : any {
        if (activeEntry.identifier.lazy) throw new Error('Lazy identifiers can not use `Write` effect')

        this.walkContext.currentEpoch++

        effect.writes.forEach(writeInfo => writeInfo.identifier.write(this, ...writeInfo.proposedArgs))
    }


    // this method is not decomposed into smaller ones intentionally, as that makes benchmarks worse
    // it seems that overhead of calling few more functions in such tight loop as this outweights the optimization
    * calculateTransitionsStackGen (context : CalculationContext<any>, stack : LeveledStack<QuarkEntry>) : Generator<any, void, unknown> {
        const entries = this.entries

        while (stack.length) {
            const entry             = stack.last()
            const identifier        = entry.identifier

            // all entries in the stack must have entry already
            if (entry.edgesFlow == 0) {
                entry.edgesFlow--

                entries.delete(identifier)

                const previousEntry = entry.previous

                // // reduce garbage collection workload
                entry.cleanup()

                if (previousEntry && previousEntry.outgoing) {
                    for (const previousOutgoingEntry of previousEntry.outgoing) {
                        if (previousOutgoingEntry !== this.baseRevision.getLatestEntryFor(previousOutgoingEntry.identifier)) continue

                        const outgoingEntry     = entries.get(previousOutgoingEntry.identifier)

                        if (outgoingEntry) outgoingEntry.edgesFlow--
                    }
                }

                stack.pop()
                continue
            }

            const quark : QuarkEntry   = entry.origin

            if (quark && quark.hasValue() || entry.edgesFlow < 0) {
                entry.cleanup()

                stack.pop()
                continue
            }

            const startedAtEpoch    = entry.visitEpoch

            let iterationResult : IteratorResult<any>   = entry.isCalculationStarted() ? entry.iterationResult : entry.startCalculation(this.onEffectSync)

            do {
                const value         = iterationResult.value

                if (entry.isCalculationCompleted()) {
                    if (entry.visitEpoch !== startedAtEpoch) {
                        stack.pop()
                        break
                    }

                    const quark         = entry.getQuark()

                    entry.setValue(value)

                    const previousEntry = entry.previous

                    // // reduce garbage collection workload
                    entry.cleanup()

                    let ignoreSelfDependency : boolean = false

                    const sameAsPrevious    = Boolean(previousEntry && previousEntry.hasValue() && identifier.equality(value, previousEntry.value))

                    // if (sameAsPrevious) entry.sameAsPrevious    = true

                    if (sameAsPrevious && previousEntry.outgoing) {
                        for (const previousOutgoingEntry of previousEntry.outgoing) {
                            if (previousOutgoingEntry !== this.baseRevision.getLatestEntryFor(previousOutgoingEntry.identifier)) continue

                            // copy the "latest" ougoing edges from the previous entry - otherwise the dependency will be lost
                            entry.getOutgoing().add(previousOutgoingEntry)

                            const outgoingEntry = entries.get(previousOutgoingEntry.identifier)

                            if (outgoingEntry) outgoingEntry.edgesFlow--
                        }
                    }

                    if (quark.usedProposedOrCurrent) {
                        if (quark.proposedValue !== undefined) {
                            if (identifier.equality(value, quark.proposedValue)) ignoreSelfDependency = true
                        } else {
                            if (sameAsPrevious) ignoreSelfDependency = true
                        }

                        if (!ignoreSelfDependency) this.candidate.selfDependentQuarks.add(quark.identifier)
                    }

                    stack.pop()
                    break
                }
                else if (value instanceof Identifier) {
                    if (entry.identifier.level > value.level) throw new Error('Identifier can not read from higher level identifier')

                    let requestedEntry : QuarkEntry             = entries.get(value)

                    if (!requestedEntry) {
                        const previousEntry = this.baseRevision.getLatestEntryFor(value)

                        if (!previousEntry) throwUnknownIdentifier(value)

                        requestedEntry      = identifier.quarkClass.new({ identifier : value, origin : previousEntry.origin, previous : previousEntry })

                        entries.set(value, requestedEntry)

                        if (!previousEntry.origin) requestedEntry.forceCalculation()
                    }

                    requestedEntry.getOutgoing().add(entry)

                    //----------------
                    let requestedQuark : QuarkEntry             = requestedEntry.origin

                    if (requestedQuark && requestedQuark.hasValue()) {
                        if (requestedQuark.value === TombStone) throwUnknownIdentifier(value)

                        iterationResult         = entry.continueCalculation(requestedQuark.value)
                    }
                    else if (requestedEntry.isShadow()) {
                        // shadow entry is shadowing a quark w/o value - it is still transitioning or lazy
                        // in both cases start new calculation
                        requestedEntry.origin   = requestedEntry
                        requestedEntry.forceCalculation()

                        stack.push(requestedEntry)
                        break
                    }
                    else {
                        if (!requestedEntry.isCalculationStarted()) {
                            stack.push(requestedEntry)
                            break
                        }
                        else {
                            throw new Error("cycle")
                            // cycle - the requested quark has started calculation (means it was encountered in this loop before)
                            // but the calculation did not complete yet (even that requested quark is calculated before the current)
                            // yield GraphCycleDetectedEffect.new()
                        }
                    }
                }
                else if (value === SynchronousCalculationStarted) {
                    // the fact, that we've encountered `SynchronousCalculationStarted` constant can mean 2 things:
                    // 1) there's a cycle during synchronous computation (we throw exception in `read` method)
                    // 2) some other computation is reading synchronous computation, that has already started
                    //    in such case its safe to just unwind the stack

                    stack.pop()
                    break
                }
                else {
                    // bypass the unrecognized effect to the outer context
                    const effectResult          = yield value

                    // the calculation can be interrupted (`cleanupCalculation`) as a result of the effect (WriteEffect)
                    // in such case we can not continue calculation and just exit the inner loop
                    if (entry.iterationResult)
                        iterationResult         = entry.continueCalculation(effectResult)
                    else
                        break
                }

            } while (true)
        }
    }


    // // THIS METHOD HAS TO BE KEPT SYNCED WITH THE `calculateTransitionsStackGen` !!!
    calculateTransitionsStackSync (context : CalculationContext<any>, stack : LeveledStack<QuarkEntry>) {
        const entries = this.entries

        while (stack.length) {
            const entry             = stack.last()
            const identifier        = entry.identifier

            // all entries in the stack must have entry already
            if (entry.edgesFlow == 0) {
                entry.edgesFlow--

                entries.delete(identifier)

                const previousEntry = entry.previous

                // // reduce garbage collection workload
                entry.cleanup()

                if (previousEntry && previousEntry.outgoing) {
                    for (const previousOutgoingEntry of previousEntry.outgoing) {
                        if (previousOutgoingEntry !== this.baseRevision.getLatestEntryFor(previousOutgoingEntry.identifier)) continue

                        const outgoingEntry     = entries.get(previousOutgoingEntry.identifier)

                        if (outgoingEntry) outgoingEntry.edgesFlow--
                    }
                }

                stack.pop()
                continue
            }

            const quark : QuarkEntry   = entry.origin

            if (quark && quark.hasValue() || entry.edgesFlow < 0) {
                entry.cleanup()

                stack.pop()
                continue
            }

            const startedAtEpoch    = entry.visitEpoch

            let iterationResult : IteratorResult<any>   = entry.isCalculationStarted() ? entry.iterationResult : entry.startCalculation(this.onEffectSync)

            do {
                const value         = iterationResult.value

                if (entry.isCalculationCompleted()) {
                    if (entry.visitEpoch !== startedAtEpoch) {
                        stack.pop()
                        break
                    }

                    const quark         = entry.getQuark()

                    entry.setValue(value)

                    const previousEntry = entry.previous

                    // // reduce garbage collection workload
                    entry.cleanup()

                    // TODO review the calculation of this flag, probably it should always compare with proposed value (if its available)
                    // and only if that is missing - with previous
                    // hint - keep in mind as "proposed" would be a separate identifier, which is assigned with a new value
                    let ignoreSelfDependency : boolean = false

                    const sameAsPrevious    = Boolean(previousEntry && previousEntry.hasValue() && identifier.equality(value, previousEntry.value))

                    // if (sameAsPrevious) entry.sameAsPrevious    = true

                    if (sameAsPrevious && previousEntry.outgoing) {
                        for (const previousOutgoingEntry of previousEntry.outgoing) {
                            if (previousOutgoingEntry !== this.baseRevision.getLatestEntryFor(previousOutgoingEntry.identifier)) continue

                            // copy the "latest" ougoing edges from the previous entry - otherwise the dependency will be lost
                            entry.getOutgoing().add(previousOutgoingEntry)

                            const outgoingEntry = entries.get(previousOutgoingEntry.identifier)

                            if (outgoingEntry) outgoingEntry.edgesFlow--
                        }
                    }

                    if (quark.usedProposedOrCurrent) {
                        if (quark.proposedValue !== undefined) {
                            if (identifier.equality(value, quark.proposedValue)) ignoreSelfDependency = true
                        } else {
                            if (sameAsPrevious) ignoreSelfDependency = true
                        }

                        if (!ignoreSelfDependency) this.candidate.selfDependentQuarks.add(quark.identifier)
                    }

                    stack.pop()
                    break
                }
                else if (value instanceof Identifier) {
                    if (entry.identifier.level > value.level) throw new Error('Identifier can not read from higher level identifier')

                    let requestedEntry : QuarkEntry             = entries.get(value)

                    if (!requestedEntry) {
                        const previousEntry = this.baseRevision.getLatestEntryFor(value)

                        if (!previousEntry) throwUnknownIdentifier(value)

                        requestedEntry      = identifier.quarkClass.new({ identifier : value, origin : previousEntry.origin, previous : previousEntry })

                        entries.set(value, requestedEntry)

                        if (!previousEntry.origin) requestedEntry.forceCalculation()
                    }

                    requestedEntry.getOutgoing().add(entry)

                    //----------------
                    let requestedQuark : QuarkEntry             = requestedEntry.origin

                    if (requestedQuark && requestedQuark.hasValue()) {
                        iterationResult         = entry.continueCalculation(requestedQuark.value)
                    }
                    else if (requestedEntry.isShadow()) {
                        // shadow entry is shadowing a quark w/o value - it is still transitioning or lazy
                        // in both cases start new calculation
                        requestedEntry.origin   = requestedEntry
                        requestedEntry.forceCalculation()

                        stack.push(requestedEntry)
                        break
                    }
                    else {
                        if (!requestedEntry.isCalculationStarted()) {
                            stack.push(requestedEntry)
                            break
                        }
                        else {
                            throw new Error("cycle")
                            // cycle - the requested quark has started calculation (means it was encountered in this loop before)
                            // but the calculation did not complete yet (even that requested quark is calculated before the current)
                            // yield GraphCycleDetectedEffect.new()
                        }
                    }
                }
                else if (value === SynchronousCalculationStarted) {
                    // the fact, that we've encountered `SynchronousCalculationStarted` constant can mean 2 things:
                    // 1) there's a cycle during synchronous computation (we throw exception in `read` method)
                    // 2) some other computation is reading synchronous computation, that has already started
                    //    in such case its safe to just unwind the stack

                    stack.pop()
                    break
                }
                else {
                    // bypass the unrecognized effect to the outer context
                    const effectResult          = context(value)

                    // the calculation can be interrupted (`cleanupCalculation`) as a result of the effect (WriteEffect)
                    if (entry.iterationResult)
                        // in such case we can not continue calculation
                        iterationResult         = entry.continueCalculation(effectResult)
                    else
                        // and just exit the inner loop
                        break
                }

            } while (true)
        }
    }
}

export type Transaction = Mixin<typeof Transaction>

export interface TransactionI extends Transaction {}

export class MinimalTransaction extends Transaction(Base) {}
