import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { OnCycleAction, VisitInfo, WalkContext, WalkStep } from "../graph/WalkDepth.js"
import { CalculationContext, runGeneratorAsyncWithEffect, runGeneratorSyncWithEffect } from "../primitives/Calculation.js"
import { Identifier, Variable } from "./Identifier.js"
import { Quark, TombstoneQuark } from "./Quark.js"
import { QuarkTransition } from "./QuarkTransition.js"
import { MinimalRevision, QuarkEntry, Revision } from "./Revision.js"


//---------------------------------------------------------------------------------------------------------------------
export type NotPromise<T> = T extends Promise<any> ? never : T

export type SyncEffectHandler = <T>(effect : any) => T & NotPromise<T>
export type AsyncEffectHandler = <T>(effect : any) => Promise<T>


//---------------------------------------------------------------------------------------------------------------------
export class WalkForwardQuarkContext<Label = any> extends WalkContext<Identifier, Label> {
    visited         : Map<Identifier, QuarkEntry>

    baseRevision    : Revision


    getVisitedInfo (node : Identifier) : VisitInfo {
        const entry     = this.visited.get(node)

        return entry ? entry.getTransition() : undefined
    }


    setVisitedInfo (identifier : Identifier, visitedAt : number, visitedTopologically : boolean, transition : QuarkTransition) : VisitInfo {
        if (!transition) {
            const entry     = QuarkEntry.new({ identifier, quark : null, outgoing : null, transition : null })

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

        visitInfo.previous      = entry

        if (!entry.outgoing) return

        for (const outgoingEntry of entry.outgoing) {
            const identifier    = outgoingEntry.quark.identifier

            let entry : QuarkEntry              = this.visited.get(identifier)

            if (!entry) {
                entry                           = QuarkEntry.new({ identifier, quark : null, outgoing : null, transition : null })

                this.visited.set(identifier, entry)
            }

            entry.getTransition().edgesFlow++

            toVisit.push({ node : identifier, from : node, label : undefined })
        }
    }
}

//---------------------------------------------------------------------------------------------------------------------
// const BuiltInEffectSymbol           = Symbol('EffectSymbol')
//
// export type BuiltInEffect           = [ typeof BuiltInEffectSymbol, symbol, ...any[] ]
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export const ProposedValueSymbol    = Symbol('ProposedValueSymbol')
//
// export type ProposedValueEffect     = [ typeof BuiltInEffectSymbol, typeof ProposedValueSymbol, ImpureCalculatedValueGen ]
//
// export const ProposedValue          = (impureIdentifier : ImpureCalculatedValueGen) : ProposedValueEffect => {
//     return [ BuiltInEffectSymbol, ProposedValueSymbol, impureIdentifier ]
// }
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export const ProposedOrCurrentValueSymbol     = Symbol('ProposedOrCurrentValueSymbol')
//
// export type ProposedOrCurrentValueEffect      = [ typeof BuiltInEffectSymbol, typeof ProposedOrCurrentValueSymbol ]
//
// export const ProposedOrCurrentValue           = () : ProposedOrCurrentValueEffect => {
//     return [ BuiltInEffectSymbol, ProposedOrCurrentValueSymbol ]
// }



//---------------------------------------------------------------------------------------------------------------------
export const Transaction = <T extends AnyConstructor<Base>>(base : T) =>

class Transaction extends base {
    baseRevision            : Revision

    private isClosed        : boolean                   = false

    walkContext             : WalkForwardQuarkContext

    // we use 2 different stacks, because they support various effects
    stackSync               : QuarkEntry[]         = []
    // the `stackGen` supports async effects notably
    stackGen                : QuarkEntry[]         = []

    candidate               : Revision

    onEffectSync            : SyncEffectHandler         = x => x
    onEffectAsync           : AsyncEffectHandler        = async x => await x


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
    }


    get entries () : Map<Identifier, QuarkEntry> {
        return this.walkContext.visited
    }


    isEmpty () : boolean {
        return this.entries.size === 0
    }


    read (identifier : Identifier) : any {
        let entry           = this.entries.get(identifier)

        // `stackSync` is always empty, except when the synchronous "batch" is being processed
        const activeStack   = this.stackSync.length > 0 ? this.stackSync : this.stackGen
        const activeEntry   = activeStack[ activeStack.length - 1 ]

        if (!entry) {
            const latestEntry       = this.baseRevision.getLatestEntryFor(identifier)

            if (!latestEntry) throw new Error(`Unknown identifier ${identifier}`)

            entry                   = QuarkEntry.new({ identifier, quark : latestEntry.quark, outgoing : new Set() })

            this.entries.set(identifier, entry)
        }

        entry.getOutgoing().add(activeEntry)

        if (entry.quark && entry.quark.hasValue()) {
            return entry.quark.value
        }

        this.stackSync.push(entry)

        this.calculateTransitionsStackSync(this.onEffectSync, this.stackSync)

        if (!entry.quark || !entry.quark.hasValue()) throw new Error('Should not happen')

        return entry.quark.value
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

        entry.getTransition().edgesFlow  = 1e9

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

            for (const entry of entries.values()) entry.transition = null
        } else {
            // in this branch candidate's scope already has some content - this is the case for calculating lazy values

            // TODO benchmark what is faster (for small maps) - `map.forEach(entry => {})` or `for (const entry of map) {}`
            entries.forEach((entry : QuarkEntry, identifier : Identifier) => {
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
            [ this.onEffectAsync, this.stackGen ],
            this
        )

        this.populateCandidateScopeFromTransitions(candidate, this.entries)

        return candidate
    }


    // [ProposedValueSymbol] (effect : ProposedValueEffect, transition : QuarkTransition) {
    //     const identifier : ImpureCalculatedValueGen = effect[ 2 ]
    //
    //     const userInputQuark    = this.candidate.getLatestProposedQuarkFor(identifier)
    //
    //     if (userInputQuark) {
    //         userInputQuark.addEdgeTo(transition.current as Quark, this.candidate)
    //
    //         return userInputQuark.value[ 0 ]
    //
    //     } else {
    //         return undefined
    //     }
    // }
    //
    //
    // [ProposedOrCurrentValueSymbol] (effect : ProposedOrCurrentValueEffect, transition : QuarkTransition) {
    //     const quark                                 = transition.current as ImpureCalculatedQuark
    //     const identifier : ImpureCalculatedValueGen = quark.identifier as ImpureCalculatedValueGen
    //
    //     quark.usedProposed      = true
    //
    //     const userInputQuark    = this.candidate.proposed.get(identifier)
    //
    //     if (userInputQuark) {
    //         userInputQuark.addEdgeTo(quark, this.candidate)
    //
    //         return userInputQuark.value[ 0 ]
    //
    //     } else {
    //         return (this.baseRevision.getLatestEntryFor(identifier) as Quark).value
    //     }
    // }


    * calculateTransitionsStackGen (context : CalculationContext<any>, stack : QuarkEntry[]) : Generator<any, void, unknown> {
        const { entries, candidate } = this

        while (stack.length) {
            const entry             = stack[ stack.length - 1 ]
            const identifier        = entry.identifier
            const transition        = entry.transition

            // all entries in the stack must have transition already
            if (transition.edgesFlow == 0) {
                transition.edgesFlow--

                entries.delete(identifier)

                const previousEntry = transition.previous

                if (previousEntry && previousEntry.quark && previousEntry.outgoing) {
                    for (const previousOutgoingEntry of previousEntry.outgoing) {
                        const entry     = entries.get(previousOutgoingEntry.identifier)

                        if (entry) entry.transition.edgesFlow--
                    }
                }

                stack.pop()
                continue
            }

            const quark : Quark   = entry.quark

            if (quark && quark.hasValue() || transition.edgesFlow < 0) {
                stack.pop()
                continue
            }

            let iterationResult : IteratorResult<any>   = transition.isCalculationStarted() ? transition.iterationResult : transition.startCalculation(this)

            do {
                const value         = iterationResult.value

                if (transition.isCalculationCompleted()) {
                    entry.getQuark().value          = value

                    const previousEntry             = transition.previous

                    // // TODO review the calculation of this flag, probably it should always compare with proposed value (if its available)
                    // // and only if that is missing - with previous
                    // // hint - keep in mind as "proposed" would be a separate identifier, which is assigned with a new value
                    // let ignoreSelfDependency : boolean = false

                    if (previousEntry && previousEntry.quark && previousEntry.quark.hasValue() && previousEntry.outgoing && identifier.equality(value, previousEntry.quark.value)) {
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
                    let requestedEntry : QuarkEntry             = entries.get(value)

                    if (!requestedEntry) {
                        const previousEntry = this.baseRevision.getLatestEntryFor(value)

                        if (!previousEntry) throw new Error(`Unknown identifier ${value}`)

                        requestedEntry      = QuarkEntry.new({ identifier : value, quark : previousEntry.quark, outgoing : new Set() })

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

                            requestedEntry.getTransition().edgesFlow = 1e9

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
                // else if (value && value[ 0 ] === BuiltInEffectSymbol) {
                //     const effectResult          = this[ value[ 1 ] ](value, transition)
                //
                //     iterationResult             = transition.continueCalculation(effectResult)
                // }
                else {
                    // bypass the unrecognized effect to the outer context
                    iterationResult             = transition.continueCalculation(yield value)
                }

            } while (true)
        }
    }


    // // THIS METHOD HAS TO BE KEPT SYNCED WITH THE `calculateTransitionsStackGen` !!!
    calculateTransitionsStackSync (context : CalculationContext<any>, stack : QuarkEntry[]) {
        const { entries, candidate } = this

        while (stack.length) {
            const entry             = stack[ stack.length - 1 ]
            const identifier        = entry.identifier
            const transition        = entry.transition

            // all entries in the stack must have transition already
            if (transition.edgesFlow == 0) {
                transition.edgesFlow--

                entries.delete(identifier)

                const previousEntry = transition.previous

                if (previousEntry && previousEntry.quark && previousEntry.outgoing) {
                    for (const previousOutgoingEntry of previousEntry.outgoing) {
                        const entry     = entries.get(previousOutgoingEntry.identifier)

                        if (entry) entry.transition.edgesFlow--
                    }
                }

                stack.pop()
                continue
            }

            const quark : Quark   = entry.quark

            // if (entry.quark === PendingQuarkMarker) {
            //     quark               = transition.current = MinimalQuark.new({ identifier })
            // } else
            //     quark               = transition.current as Quark

            if (quark && quark.hasValue() || transition.edgesFlow < 0) {
                stack.pop()
                continue
            }

            let iterationResult : IteratorResult<any>   = transition.isCalculationStarted() ? transition.iterationResult : transition.startCalculation(this)

            do {
                const value         = iterationResult.value

                if (transition.isCalculationCompleted()) {
                    entry.getQuark().value          = value

                    const previousEntry             = transition.previous

                    // // TODO review the calculation of this flag, probably it should always compare with proposed value (if its available)
                    // // and only if that is missing - with previous
                    // // hint - keep in mind as "proposed" would be a separate identifier, which is assigned with a new value
                    // let ignoreSelfDependency : boolean = false

                    if (previousEntry && previousEntry.quark && previousEntry.quark.hasValue() && previousEntry.outgoing && identifier.equality(value, previousEntry.quark.value)) {
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
                    let requestedEntry : QuarkEntry             = entries.get(value)

                    if (!requestedEntry) {
                        const previousEntry = this.baseRevision.getLatestEntryFor(value)

                        if (!previousEntry) throw new Error(`Unknown identifier ${value}`)

                        requestedEntry      = QuarkEntry.new({ identifier : value, quark : previousEntry.quark, outgoing : new Set() })

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

                            requestedEntry.getTransition().edgesFlow = 1e9

                            break
                        } else {
                            // already calculated entry from previous revision
                            iterationResult         = transition.continueCalculation(requestedQuark.value)
                        }
                    }
                    else {
                        if (/*requestedTransition.isCalculationCompleted() || */requestedQuark && requestedQuark.hasValue()) {
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

                    // let requestedQuark          = requestedTransition ? requestedTransition.current : checkout.get(value)
                    //
                    // if (!requestedQuark) throw new Error(`Unknown identifier ${value}`)
                    //
                    // if (requestedQuark === PendingQuarkMarker) {
                    //     requestedQuark          = requestedTransition.current = MinimalQuark.new({ identifier : value })
                    // }
                    // else
                    //     if (requestedQuark === LazyQuarkMarker) {
                    //         requestedQuark      = MinimalQuark.new({ identifier : value })
                    //
                    //         if (requestedTransition) {
                    //             requestedTransition.current = requestedQuark
                    //         } else {
                    //             requestedTransition = getTransitionClass(value).new({ identifier : value, previous : LazyQuarkMarker, current : requestedQuark, edgesFlow : 1e9 })
                    //
                    //             transitions.set(value, requestedTransition)
                    //         }
                    //     }
                    //
                    // requestedQuark.addEdgeTo(quark, candidate)
                    //
                    // if (!requestedTransition || requestedQuark.hasValue()) {
                    //     iterationResult         = transition.continueCalculation(requestedQuark.value)
                    // }
                    // else if (!requestedTransition.isCalculationStarted()) {
                    //     stack.push(requestedEntry)
                    //
                    //     break
                    // }
                    // else {
                    //     throw new Error("cycle")
                    //     // cycle - the requested quark has started calculation (means it was encountered in this loop before)
                    //     // but the calculation did not complete yet (even that requested quark is calculated before the current)
                    //     // yield GraphCycleDetectedEffect.new()
                    // }
                }
                // else if (value && value[ 0 ] === BuiltInEffectSymbol) {
                //     const effectResult          = this[ value[ 1 ] ](value, transition)
                //
                //     iterationResult             = transition.continueCalculation(effectResult)
                // }
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
