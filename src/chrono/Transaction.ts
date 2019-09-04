import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { OnCycleAction, VisitInfo, WalkContext, WalkStep } from "../graph/WalkDepth.js"
import { CalculationContext, runGeneratorAsyncWithEffect, runGeneratorSyncWithEffect } from "../primitives/Calculation.js"
import { Identifier, Variable } from "./Identifier.js"
import { Quark, Tombstone } from "./Quark.js"
import { QuarkTransition } from "./QuarkTransition.js"
import { MinimalRevision, Revision } from "./Revision.js"


//---------------------------------------------------------------------------------------------------------------------
export type NotPromise<T> = T extends Promise<any> ? never : T

export type SyncEffectHandler = <T>(effect : YieldableValue) => T & NotPromise<T>
export type AsyncEffectHandler = <T>(effect : YieldableValue) => Promise<T>


//---------------------------------------------------------------------------------------------------------------------
export class WalkForwardQuarkContext<Label = any> extends WalkContext<Identifier, Label> {
    visited         : Map<Identifier, Quark>

    baseRevision    : Revision


    getVisitedInfo (node : Identifier) : VisitInfo {
        const entry     = this.visited.get(node)

        return entry ? entry.getTransition() : undefined
    }


    setVisitedInfo (identifier : Identifier, visitedAt : number, visitedTopologically : boolean, transition : QuarkTransition) : VisitInfo {
        if (!transition) {
            const entry     = identifier.quarkClass.new({ identifier, value : undefined, outgoing : null, transition : null })

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

        if (node.lazy && entry.usedProposedOrCurrent) {
            // for lazy quarks, that depends on the `ProposedOrCurrent` effect, we need to save the value or proposed value
            // from the previous revision
            // this is because that, for "historyLimit = 1", the previous revision's data will be completely overwritten by the new one
            // so general consideration is - the revision should contain ALL information needed to calculate it
            // alternatively, this could be done during the `populateCandidateScopeFromTransitions`
            visitInfo.quark.proposedValue   = entry.value
        }

        if (!entry.outgoing) return

        for (const outgoingEntry of entry.outgoing) {
            const identifier    = outgoingEntry.identifier

            let entry : Quark              = this.visited.get(identifier)

            if (!entry) {
                entry                           = identifier.quarkClass.new({ identifier, value : undefined, outgoing : null, transition : null })

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
    stackSync               : Quark[]          = []
    // the `stackGen` supports async effects notably
    stackGen                : Quark[]          = []

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


    get entries () : Map<Identifier, Quark> {
        return this.walkContext.visited
    }


    isEmpty () : boolean {
        return this.entries.size === 0
    }


    getActiveEntry () : Quark {
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

            entry                   = identifier.quarkClass.new({ identifier, value : latestEntry.value, outgoing : new Set() })

            this.entries.set(identifier, entry)
        }

        entry.getOutgoing().add(activeEntry)

        if (entry.hasValue()) return entry.value

        this.stackSync.push(entry)

        this.calculateTransitionsStackSync(this.onEffectSync, this.stackSync)

        if (!entry.hasValue()) throw new Error('Should not happen')

        return entry.value
    }


    write (identifier : Identifier, value : any) {
        if (this.isClosed) throw new Error("Can not 'write' to closed transaction")

        const entry                 = this.touch(identifier)

        if (identifier instanceof Variable)
            entry.value             = value
        else
            entry.proposedValue     = value
    }


    touch (identifier : Identifier) : Quark {
        this.walkContext.continueFrom([ identifier ])

        const entry                 = this.entries.get(identifier)

        entry.getTransition().forceCalculation()

        return entry
    }


    removeIdentifier (identifier : Identifier) {
        const entry                 = this.touch(identifier)

        entry.value                 = Tombstone
    }


    populateCandidateScopeFromTransitions (candidate : Revision, entries : Map<Identifier, Quark>) {
        if (candidate.scope.size === 0) {
            // in this branch we can overwrite the whole map
            candidate.scope     = entries

            for (const entry of entries.values()) entry.transition = null
        } else {
            // in this branch candidate's scope already has some content - this is the case for calculating lazy values

            // TODO benchmark what is faster (for small maps) - `map.forEach(entry => {})` or `for (const entry of map) {}`
            entries.forEach((entry : Quark, identifier : Identifier) => {
                candidate.scope.set(identifier, entry)

                entry.transition    = null
            })
        }
    }


    propagate () : Revision {
        if (this.isClosed) throw new Error('Can not propagate closed revision')

        this.isClosed   = true

        const candidate = this.candidate

        for (const selfDependentQuark of this.baseRevision.selfDependentQuarks) this.touch(selfDependentQuark.identifier)

        runGeneratorSyncWithEffect<any, any, [ CalculationContext<any>, Quark[] ]>(
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

        await runGeneratorAsyncWithEffect<any, any, [ CalculationContext<any>, Quark[] ]>(
            this.calculateTransitionsStackGen,
            [ this.onEffectSync, this.stackGen ],
            this
        )

        this.populateCandidateScopeFromTransitions(candidate, this.entries)

        return candidate
    }


    [ProposedOrCurrentSymbol] (effect : Effect, entry : Quark) : any {
        entry.usedProposedOrCurrent = true

        const proposedValue     = entry.proposedValue

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


    * calculateTransitionsStackGen (context : CalculationContext<any>, stack : Quark[]) : Generator<any, void, unknown> {
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
                transition.quark    = undefined
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

            if (!transition || entry.hasValue() || transition.edgesFlow < 0) {
                stack.pop()
                continue
            }

            let iterationResult : IteratorResult<any>   = transition.isCalculationStarted() ? transition.iterationResult : transition.startCalculation(this.onEffectSync)

            do {
                const value         = iterationResult.value

                if (transition.isCalculationCompleted()) {
                    entry.value                     = value

                    // reduce garbage collection workload
                    transition.quark                = undefined
                    transition.previous             = undefined
                    entry.transition                = undefined

                    const previousEntry             = transition.previous

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

                    if (entry.usedProposedOrCurrent) {
                        if (entry.proposedValue !== undefined) {
                            if (identifier.equality(value, entry.proposedValue)) ignoreSelfDependency = true
                        } else {
                            if (sameAsPrevious) ignoreSelfDependency = true
                        }

                        if (!ignoreSelfDependency) this.candidate.selfDependentQuarks.add(entry)
                    }

                    stack.pop()
                    break
                }
                else if (value instanceof Identifier) {
                    let requestedEntry : Quark             = entries.get(value)

                    if (!requestedEntry) {
                        const previousEntry = this.baseRevision.getLatestEntryFor(value)

                        if (!previousEntry) throw new Error(`Unknown identifier ${value}`)

                        requestedEntry      = identifier.quarkClass.new({ identifier : value, value : previousEntry.value, outgoing : new Set() })

                        entries.set(value, requestedEntry)
                    }

                    let requestedTransition : QuarkTransition   = requestedEntry.transition

                    requestedEntry.getOutgoing().add(entry)

                    if (!requestedTransition) {
                        // no transition - "shadowing" entry from the previous revision

                        if (requestedEntry.hasValue()) {
                            // already calculated entry from previous revision
                            iterationResult         = transition.continueCalculation(requestedEntry.value)
                        } else {
                            // lazy entry from previous revision
                            stack.push(requestedEntry)

                            requestedEntry.getTransition().forceCalculation()

                            break
                        }
                    }
                    else {
                        if (requestedEntry && requestedEntry.hasValue()) {
                            iterationResult         = transition.continueCalculation(requestedEntry.value)
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
    calculateTransitionsStackSync (context : CalculationContext<any>, stack : Quark[]) {
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

                if (previousEntry && previousEntry.outgoing) {
                    for (const previousOutgoingEntry of previousEntry.outgoing) {
                        const entry     = entries.get(previousOutgoingEntry.identifier)

                        if (entry) entry.transition.edgesFlow--
                    }
                }

                stack.pop()
                continue
            }

            if (!transition || entry.hasValue() || transition.edgesFlow < 0) {
                stack.pop()
                continue
            }

            let iterationResult : IteratorResult<any>   = transition.isCalculationStarted() ? transition.iterationResult : transition.startCalculation(this.onEffectSync)

            do {
                const value         = iterationResult.value

                if (transition.isCalculationCompleted()) {
                    entry.value                     = value

                    const previousEntry             = transition.previous

                    // // TODO review the calculation of this flag, probably it should always compare with proposed value (if its available)
                    // // and only if that is missing - with previous
                    // // hint - keep in mind as "proposed" would be a separate identifier, which is assigned with a new value
                    // let ignoreSelfDependency : boolean = false

                    if (previousEntry && previousEntry.hasValue() && previousEntry.outgoing && identifier.equality(value, previousEntry.value)) {
                        // in case the new value is equal to previous, we still need to consider the case
                        // that the incoming dependencies of this identifier has changed (even that the value has not)
                        // TODO write test for this case, need to test the identifiers, that depends on such idents (copy outgoing edges from previous?)

                        for (const previousOutgoingEntry of previousEntry.outgoing) {
                            const entry = entries.get(previousOutgoingEntry.identifier)

                            if (entry) entry.transition.edgesFlow--
                        }

                        // ignoreSelfDependency        = true
                    }

                    // if (quark.identifier instanceof ImpureCalculatedValueGen) {
                    //     const castedQuark = quark as ImpureCalculatedQuark
                    //
                    //     // TODO - if there's no 'previousQuark', compare with proposed value
                    //     if (!previousQuark && castedQuark.usedProposed) {
                    //         if (castedQuark.identifier.equality(value, this.candidate.getLatestProposedQuarkFor(castedQuark.identifier).value[ 0 ] )) ignoreSelfDependency = true
                    //     }
                    //
                    //     if (castedQuark.usedProposed && !ignoreSelfDependency) {
                    //         this.candidate.selfDependentQuarks.push(quark)
                    //     }
                    // }

                    stack.pop()
                    break
                }
                else if (value instanceof Identifier) {
                    let requestedEntry : Quark             = entries.get(value)

                    if (!requestedEntry) {
                        const previousEntry = this.baseRevision.getLatestEntryFor(value)

                        if (!previousEntry) throw new Error(`Unknown identifier ${value}`)

                        requestedEntry      = identifier.quarkClass.new({ identifier : value, value : previousEntry.value, outgoing : new Set() })

                        entries.set(value, requestedEntry)
                    }

                    let requestedTransition : QuarkTransition   = requestedEntry.transition

                    requestedEntry.getOutgoing().add(entry)

                    if (!requestedTransition) {
                        // no transition - "shadowing" entry from the previous revision

                        if (requestedEntry.hasValue()) {
                            // already calculated entry from previous revision
                            iterationResult         = transition.continueCalculation(requestedEntry.value)
                        } else {
                            // lazy entry from previous revision
                            stack.push(requestedEntry)

                            requestedEntry.getTransition().forceCalculation()

                            break
                        }
                    }
                    else {
                        if (requestedEntry && requestedEntry.hasValue()) {
                            iterationResult         = transition.continueCalculation(requestedEntry.value)
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
