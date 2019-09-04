import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { OnCycleAction, VisitInfo, WalkContext, WalkStep } from "../graph/WalkDepth.js"
import { CalculationContext, runGeneratorAsyncWithEffect, runGeneratorSyncWithEffect } from "../primitives/Calculation.js"
import { copyMapInto } from "../util/Helpers.js"
import { Identifier, Variable } from "./Identifier.js"
import { Quark, TombstoneQuark } from "./Quark.js"
import { QuarkTransition } from "./QuarkTransition.js"
import { MinimalRevision, QuarkEntry, Revision } from "./Revision.js"


//---------------------------------------------------------------------------------------------------------------------
export type NotPromise<T> = T extends Promise<any> ? never : T

export type SyncEffectHandler = <T>(effect : YieldableValue) => T & NotPromise<T>
export type AsyncEffectHandler = <T>(effect : YieldableValue) => Promise<T>


//---------------------------------------------------------------------------------------------------------------------
export class WalkForwardQuarkContext extends WalkContext<Identifier> {
    visited         : Map<Identifier, QuarkEntry>

    baseRevision    : Revision


    getVisitedInfo (node : Identifier) : VisitInfo {
        const entry     = this.visited.get(node)

        return entry ? entry.getTransition() : undefined
    }


    setVisitedInfo (identifier : Identifier, visitedAt : number, visitedTopologically : boolean, transition : QuarkTransition) : VisitInfo {
        if (!transition) {
            const entry     = QuarkEntry.new({ identifier, quark : null, transition : null })

            this.visited.set(identifier, entry)

            transition      = entry.getTransition()
        }

        transition.visitedAt                = visitedAt
        transition.visitedTopologically     = visitedTopologically

        return transition
    }


    collectNext (node : Identifier, toVisit : WalkStep<Identifier>[], visitInfo : QuarkTransition) {
        const entry             = this.baseRevision.getLatestEntryFor(node)

        // newly created identifier
        if (!entry) return

        // since `collectNext` is called exactly once for every node, all nodes (which are transitions)
        // will have the `previous` property populated
        visitInfo.previous      = entry

        if (node.lazy && entry.quark && entry.quark.usedProposedOrCurrent) {
            // for lazy quarks, that depends on the `ProposedOrCurrent` effect, we need to save the value or proposed value
            // from the previous revision
            // this is because that, for "historyLimit = 1", the previous revision's data will be completely overwritten by the new one
            // so general consideration is - the revision should contain ALL information needed to calculate it
            // alternatively, this could be done during the `populateCandidateScopeFromTransitions`
            visitInfo.current.getQuark().proposedValue   = entry.value
        }

        if (!entry.outgoing) return

        for (const outgoingEntry of entry.outgoing) {
            const identifier    = outgoingEntry.quark.identifier

            if (outgoingEntry.quark !== this.baseRevision.getLatestEntryFor(identifier).quark) continue

            let entry : QuarkEntry              = this.visited.get(identifier)

            if (!entry) {
                entry                           = QuarkEntry.new({ identifier, quark : null, transition : null })

                this.visited.set(identifier, entry)
            }

            entry.getTransition().edgesFlow++

            toVisit.push({ node : identifier, from : node, label : undefined })
        }
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class Effect extends Base {
    handler     : symbol
}


//---------------------------------------------------------------------------------------------------------------------
export const ProposedOrCurrentSymbol    = Symbol('ProposedOrCurrentSymbol')

export const ProposedOrCurrent : Effect = Effect.new({ handler : ProposedOrCurrentSymbol })


//---------------------------------------------------------------------------------------------------------------------
export const CancelPropagationSymbol    = Symbol('CancelPropagationSymbol')

export const CancelPropagation : Effect = Effect.new({ handler : CancelPropagationSymbol })


//---------------------------------------------------------------------------------------------------------------------
export type YieldableValue = Effect | Identifier


//---------------------------------------------------------------------------------------------------------------------
export const Transaction = <T extends AnyConstructor<Base>>(base : T) =>

class Transaction extends base {
    baseRevision            : Revision

    private isClosed        : boolean               = false

    walkContext             : WalkForwardQuarkContext

    // we use 2 different stacks, because they support various effects
    stackSync               : QuarkEntry[]          = []
    // the `stackGen` supports async effects notably
    stackGen                : QuarkEntry[]          = []

    candidate               : Revision

    onEffectSync            : SyncEffectHandler


    // see the comment for the `onEffectSync`
    yieldSync (effect : Effect) : any {
        return this[ effect.handler ](effect, this.getActiveEntry())
    }


    initialize (...args) {
        super.initialize(...args)

        this.walkContext    = WalkForwardQuarkContext.new({
            baseRevision    : this.baseRevision,
            // ignore cycles when determining potentially changed atoms
            onCycle         : (quark : Identifier, stack : WalkStep<Identifier>[]) => OnCycleAction.Resume,

            onTopologicalNode       : (identifier : Identifier) => {
                if (!identifier.lazy) this.stackGen.push(this.entries.get(identifier))
            }
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

        return activeStack[ activeStack.length - 1 ]
    }


    read (identifier : Identifier) : any {
        // see the comment for the `onEffectSync`
        if (!(identifier instanceof Identifier)) return this.yieldSync(identifier as Effect)

        let entry           = this.entries.get(identifier)

        const activeEntry   = this.getActiveEntry()

        if (!entry) {
            const latestEntry       = this.baseRevision.getLatestEntryFor(identifier)

            if (!latestEntry) throw new Error(`Unknown identifier ${identifier}`)

            entry                   = QuarkEntry.new({ identifier, quark : latestEntry.quark })

            this.entries.set(identifier, entry)
        }

        entry.getOutgoing().add(activeEntry)

        if (entry.hasValue()) return entry.value

        entry.getTransition().forceCalculation()

        this.stackSync.push(entry)

        this.calculateTransitionsStackSync(this.onEffectSync, this.stackSync)

        if (!entry.hasValue()) throw new Error('Should not happen')

        return entry.value
    }


    write (identifier : Identifier, value : any) {
        if (this.isClosed) throw new Error("Can not 'write' to closed transaction")

        const entry                 = this.touch(identifier)

        const quarkClass            = identifier.quarkClass

        entry.quark                 =
            identifier instanceof Variable ? quarkClass.new({ identifier : identifier, value : value }) : quarkClass.new({ identifier : identifier, proposedValue : value })
    }


    touch (identifier : Identifier) : QuarkEntry {
        this.walkContext.continueFrom([ identifier ])

        const entry                 = this.entries.get(identifier)

        entry.getTransition().forceCalculation()

        return entry
    }


    removeIdentifier (identifier : Identifier) {
        const entry                 = this.touch(identifier)

        entry.quark                 = TombstoneQuark.new({ identifier })
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
            for (const entry of entries.values()) {
                // this code can be uncommented to check if we leak transitions somewhere
                // if (entry.transition) debugger

                entry.transition = null
            }
        } else {
            // in this branch candidate's scope already has some content - this is the case for calculating lazy values


            // // TODO benchmark what is faster (for small maps) - `map.forEach(entry => {})` or `for (const entry of map) {}`
            // entries.forEach((entry : QuarkEntry, identifier : Identifier) => {
            //     candidate.scope.set(identifier, entry)
            //
            //     entry.transition    = null
            // })

            copyMapInto(entries, candidate.scope)
            for (const entry of entries.values()) entry.transition = null
        }
    }


    propagate () : Revision {
        if (this.isClosed) throw new Error('Can not propagate closed revision')

        this.isClosed   = true

        const candidate = this.candidate

        for (const selfDependentQuark of this.baseRevision.selfDependentQuarks) this.touch(selfDependentQuark.identifier)

        runGeneratorSyncWithEffect<any, any, [ CalculationContext<any>, QuarkEntry[] ]>(
            this.calculateTransitionsStackGen,
            [ this.onEffectSync, this.stackGen ],
            this
        )

        this.populateCandidateScopeFromTransitions(candidate, this.entries)

        return candidate
    }


    async propagateAsync () : Promise<Revision> {
        if (this.isClosed) throw new Error('Can not propagate closed revision')

        this.isClosed   = true

        const candidate = this.candidate

        for (const selfDependentQuark of this.baseRevision.selfDependentQuarks) this.touch(selfDependentQuark.identifier)

        await runGeneratorAsyncWithEffect<any, any, [ CalculationContext<any>, QuarkEntry[] ]>(
            this.calculateTransitionsStackGen,
            [ this.onEffectSync, this.stackGen ],
            this
        )

        this.populateCandidateScopeFromTransitions(candidate, this.entries)

        return candidate
    }


    [ProposedOrCurrentSymbol] (effect : Effect, entry : QuarkEntry) : any {
        const quark             = entry.getQuark()

        quark.usedProposedOrCurrent      = true

        const proposedValue     = quark.proposedValue

        if (proposedValue !== undefined) return proposedValue

        const baseRevision      = this.baseRevision
        const identifier        = entry.identifier
        const latestEntry       = baseRevision.getLatestEntryFor(identifier)

        if (latestEntry === entry) {
            return baseRevision.previous ? baseRevision.previous.read(identifier) : (() => { debugger })()
        } else {
            return baseRevision.read(identifier)
        }
    }


    * calculateTransitionsStackGen (context : CalculationContext<any>, stack : QuarkEntry[]) : Generator<any, void, unknown> {
        const { entries } = this

        while (stack.length) {
            const entry             = stack[ stack.length - 1 ]
            const identifier        = entry.identifier
            const transition        = entry.transition

            // all entries in the stack must have transition already
            if (transition && transition.edgesFlow == 0) {
                transition.edgesFlow--

                entries.delete(identifier)

                const previousEntry = transition.previous

                // reduce garbage collection workload
                transition.current  = undefined
                transition.previous = undefined
                entry.transition    = undefined

                if (previousEntry && previousEntry.outgoing) {
                    for (const previousOutgoingEntry of previousEntry.outgoing) {
                        const entry     = entries.get(previousOutgoingEntry.identifier)

                        if (entry) entry.transition.edgesFlow--
                    }
                }

                stack.pop()
                continue
            }

            const quark : Quark   = entry.quark

            if (!transition || quark && quark.hasValue() || transition.edgesFlow < 0) {
                stack.pop()
                continue
            }

            let iterationResult : IteratorResult<any>   = transition.isCalculationStarted() ? transition.iterationResult : transition.startCalculation(this.onEffectSync)

            do {
                const value         = iterationResult.value

                if (transition.isCalculationCompleted()) {
                    const quark     = entry.getQuark()

                    quark.value          = value

                    const previousEntry             = transition.previous

                    // reduce garbage collection workload
                    transition.current              = undefined
                    transition.previous             = undefined
                    entry.transition                = undefined

                    // TODO review the calculation of this flag, probably it should always compare with proposed value (if its available)
                    // and only if that is missing - with previous
                    // hint - keep in mind as "proposed" would be a separate identifier, which is assigned with a new value
                    let ignoreSelfDependency : boolean = false

                    const sameAsPrevious            = Boolean(previousEntry && previousEntry.hasValue() && identifier.equality(value, previousEntry.value))

                    if (sameAsPrevious && previousEntry.outgoing) {
                        // in case the new value is equal to previous, we still need to consider the case
                        // that the incoming dependencies of this identifier has changed (even that the value has not)
                        // TODO write test for this case, need to test the identifiers, that depends on such idents (copy outgoing edges from previous?)

                        for (const previousOutgoingEntry of previousEntry.outgoing) {
                            const entry = entries.get(previousOutgoingEntry.identifier)

                            if (entry) entry.transition.edgesFlow--
                        }
                    }

                    if (quark.usedProposedOrCurrent) {
                        if (quark.proposedValue !== undefined) {
                            if (identifier.equality(value, quark.proposedValue)) ignoreSelfDependency = true
                        } else {
                            if (sameAsPrevious) ignoreSelfDependency = true
                        }

                        if (!ignoreSelfDependency) this.candidate.selfDependentQuarks.add(quark)
                    }

                    stack.pop()
                    break
                }
                else if (value instanceof Identifier) {
                    let requestedEntry : QuarkEntry             = entries.get(value)

                    if (!requestedEntry) {
                        const previousEntry = this.baseRevision.getLatestEntryFor(value)

                        if (!previousEntry) throw new Error(`Unknown identifier ${value}`)

                        requestedEntry      = QuarkEntry.new({ identifier : value, quark : previousEntry.quark })

                        entries.set(value, requestedEntry)
                    }

                    let requestedTransition : QuarkTransition   = requestedEntry.transition
                    let requestedQuark : Quark                  = requestedEntry.quark

                    requestedEntry.getOutgoing().add(entry)

                    if (!requestedTransition) {
                        // no transition - "shadowing" entry from the previous revision

                        if (!requestedQuark || !requestedQuark.hasValue()) {
                            // lazy entry from previous revision
                            stack.push(requestedEntry)

                            requestedEntry.getTransition().forceCalculation()

                            break
                        } else {
                            // already calculated entry from previous revision
                            iterationResult         = transition.continueCalculation(requestedQuark.value)
                        }
                    }
                    else {
                        if (requestedQuark && requestedQuark.hasValue()) {
                            iterationResult         = transition.continueCalculation(requestedQuark.value)
                        }
                        else if (!requestedTransition.isCalculationStarted()) {
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
                else {
                    // bypass the unrecognized effect to the outer context
                    iterationResult             = transition.continueCalculation(yield value)
                }

            } while (true)
        }
    }


    // // THIS METHOD HAS TO BE KEPT SYNCED WITH THE `calculateTransitionsStackGen` !!!
    calculateTransitionsStackSync (context : CalculationContext<any>, stack : QuarkEntry[]) {
        const { entries } = this

        while (stack.length) {
            const entry             = stack[ stack.length - 1 ]
            const identifier        = entry.identifier
            const transition        = entry.transition

            // all entries in the stack must have transition already
            if (transition && transition.edgesFlow == 0) {
                transition.edgesFlow--

                entries.delete(identifier)

                const previousEntry = transition.previous

                // reduce garbage collection workload
                transition.current  = undefined
                transition.previous = undefined
                entry.transition    = undefined

                if (previousEntry && previousEntry.outgoing) {
                    for (const previousOutgoingEntry of previousEntry.outgoing) {
                        const entry     = entries.get(previousOutgoingEntry.identifier)

                        if (entry) entry.transition.edgesFlow--
                    }
                }

                stack.pop()
                continue
            }

            const quark : Quark   = entry.quark

            if (!transition || quark && quark.hasValue() || transition.edgesFlow < 0) {
                stack.pop()
                continue
            }

            let iterationResult : IteratorResult<any>   = transition.isCalculationStarted() ? transition.iterationResult : transition.startCalculation(this.onEffectSync)

            do {
                const value         = iterationResult.value

                if (transition.isCalculationCompleted()) {
                    const quark     = entry.getQuark()

                    quark.value          = value

                    const previousEntry             = transition.previous

                    // reduce garbage collection workload
                    transition.current              = undefined
                    transition.previous             = undefined
                    entry.transition                = undefined

                    // TODO review the calculation of this flag, probably it should always compare with proposed value (if its available)
                    // and only if that is missing - with previous
                    // hint - keep in mind as "proposed" would be a separate identifier, which is assigned with a new value
                    let ignoreSelfDependency : boolean = false

                    const sameAsPrevious            = Boolean(previousEntry && previousEntry.hasValue() && identifier.equality(value, previousEntry.value))

                    if (sameAsPrevious && previousEntry.outgoing) {
                        // in case the new value is equal to previous, we still need to consider the case
                        // that the incoming dependencies of this identifier has changed (even that the value has not)
                        // TODO write test for this case, need to test the identifiers, that depends on such idents (copy outgoing edges from previous?)

                        for (const previousOutgoingEntry of previousEntry.outgoing) {
                            const entry = entries.get(previousOutgoingEntry.identifier)

                            if (entry) entry.transition.edgesFlow--
                        }
                    }

                    if (quark.usedProposedOrCurrent) {
                        if (quark.proposedValue !== undefined) {
                            if (identifier.equality(value, quark.proposedValue)) ignoreSelfDependency = true
                        } else {
                            if (sameAsPrevious) ignoreSelfDependency = true
                        }

                        if (!ignoreSelfDependency) this.candidate.selfDependentQuarks.add(quark)
                    }

                    stack.pop()
                    break
                }
                else if (value instanceof Identifier) {
                    let requestedEntry : QuarkEntry             = entries.get(value)

                    if (!requestedEntry) {
                        const previousEntry = this.baseRevision.getLatestEntryFor(value)

                        if (!previousEntry) throw new Error(`Unknown identifier ${value}`)

                        requestedEntry      = QuarkEntry.new({ identifier : value, quark : previousEntry.quark })

                        entries.set(value, requestedEntry)
                    }

                    let requestedTransition : QuarkTransition   = requestedEntry.transition
                    let requestedQuark : Quark                  = requestedEntry.quark

                    requestedEntry.getOutgoing().add(entry)

                    if (!requestedTransition) {
                        // no transition - "shadowing" entry from the previous revision

                        if (!requestedQuark || !requestedQuark.hasValue()) {
                            // lazy entry from previous revision
                            stack.push(requestedEntry)

                            requestedEntry.getTransition().forceCalculation()

                            break
                        } else {
                            // already calculated entry from previous revision
                            iterationResult         = transition.continueCalculation(requestedQuark.value)
                        }
                    }
                    else {
                        if (requestedQuark && requestedQuark.hasValue()) {
                            iterationResult         = transition.continueCalculation(requestedQuark.value)
                        }
                        else if (!requestedTransition.isCalculationStarted()) {
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
                else {
                    // bypass the unrecognized effect to the outer context
                    iterationResult             = transition.continueCalculation(context(value))
                }

            } while (true)
        }
    }
}

export type Transaction = Mixin<typeof Transaction>

export class MinimalTransaction extends Transaction(Base) {}
