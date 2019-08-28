import { AnyConstructor, AnyFunction, Base, Mixin } from "../class/Mixin.js"
import { map } from "../collection/Iterator.js"
import { OnCycleAction, WalkContext, WalkStep } from "../graph/WalkDepth.js"
import { runAsyncWithEffect, runSyncWithEffect } from "../primitives/Calculation.js"
import { Identifier, ImpureCalculatedValueGen, Variable } from "../primitives/Identifier.js"
import { lazyProperty } from "../util/Helpers.js"
import { getTransitionClass, LazyQuarkMarker, PendingQuarkMarker, QuarkEntry, QuarkTransition, Scope } from "./CalculationCore.js"
import { UserInputQuark, MinimalQuark, Quark, TombstoneQuark } from "./Quark.js"
import { MinimalRevision, Revision } from "./Revision.js"


//---------------------------------------------------------------------------------------------------------------------
export type NotPromise<T> = T extends Promise<any> ? never : T

export type SyncEffectHandler = <T>(effect : any) => T & NotPromise<T>
export type AsyncEffectHandler = <T>(effect : any) => Promise<T>


//---------------------------------------------------------------------------------------------------------------------
export class WalkForwardQuarkContext<Label = any> extends WalkContext<Quark, Label> {
    checkout        : Scope

    transitions     : Map<Identifier, QuarkTransition>

    walkDimension   : Revision[] = []


    forEachNext (node : Quark, func : (label : Label, node : Quark) => any) {
        node.forEachOutgoingInDimension(this.checkout, this.walkDimension, (label : Label, node : Quark) => {
            const identifier    = node.identifier

            let transition      = this.transitions.get(identifier)

            if (!transition) {
                const current   = identifier.lazy ? LazyQuarkMarker : PendingQuarkMarker

                transition      = getTransitionClass(identifier).new({ identifier, previous : node, current, edgesFlow : 0 })

                this.transitions.set(identifier, transition)
            }

            transition.edgesFlow++

            func(label, node)
        })
    }
}

//---------------------------------------------------------------------------------------------------------------------
const BuiltInEffectSymbol           = Symbol('EffectSymbol')

export type BuiltInEffect           = [ typeof BuiltInEffectSymbol, symbol, ...any[] ]


//---------------------------------------------------------------------------------------------------------------------
export const ProposedValueSymbol    = Symbol('ProposedValueSymbol')

export type ProposedValueEffect     = [ typeof BuiltInEffectSymbol, typeof ProposedValueSymbol, ImpureCalculatedValueGen ]

export const ProposedValue          = (impureIdentifier : ImpureCalculatedValueGen) : BuiltInEffect => {
    return [ BuiltInEffectSymbol, ProposedValueSymbol, impureIdentifier ]
}


//---------------------------------------------------------------------------------------------------------------------
export const CurrentProposedValueSymbol     = Symbol('CurrentProposedValueSymbol')

export type CurrentProposedValueEffect      = [ typeof BuiltInEffectSymbol, typeof CurrentProposedValueSymbol, ImpureCalculatedValueGen ]

export const CurrentProposedValue           = (impureIdentifier : ImpureCalculatedValueGen) : BuiltInEffect => {
    return [ BuiltInEffectSymbol, CurrentProposedValueSymbol, impureIdentifier ]
}



//---------------------------------------------------------------------------------------------------------------------
export const Transaction = <T extends AnyConstructor<Base>>(base : T) =>

class Transaction extends base {
    baseRevision            : Revision

    checkout                : Scope

    private isClosed        : boolean                   = false

    transitions             : Map<Identifier, QuarkTransition>  = new Map()

    walkContext             : WalkForwardQuarkContext

    // we use 2 different stacks, because they support various effects
    // the `stackGen` supports async effects notably
    stackGen                : QuarkTransition[]         = []
    stackSync               : QuarkTransition[]         = []

    candidate               : Revision

    onEffectSync            : SyncEffectHandler         = x => x
    onEffectAsync           : AsyncEffectHandler        = async x => await x


    initialize (...args) {
        super.initialize(...args)

        this.walkContext    = WalkForwardQuarkContext.new({
            checkout        : this.checkout,
            transitions     : this.transitions,
            walkDimension   : this.dimension,

            // ignore cycles when determining potentially changed atoms
            onCycle         : (quark : Quark, stack : WalkStep<Quark>[]) => OnCycleAction.Resume,

            onTopologicalNode       : (quark : Quark) => {
                if (!quark.identifier.lazy) this.stackGen.push(this.transitions.get(quark.identifier))
            }
        })

        // init internal state of the walk context, we'll use `continueFrom` afterwards
        this.walkContext.startFrom([])

        if (!this.candidate) this.candidate = MinimalRevision.new({ previous : this.baseRevision })
    }


    get dimension () : Revision[] {
        return lazyProperty(this, 'dimension', () => Array.from(this.baseRevision.thisAndAllPrevious()))
    }


    isEmpty () : boolean {
        return this.transitions.size === 0
    }


    read (identifier : Identifier) : any {
        let transition      = this.transitions.get(identifier)

        // `stackSync` is always empty, except when the synchronous "batch" is being processed
        const activeStack   = this.stackSync.length > 0 ? this.stackSync : this.stackGen
        const activeQuark   = activeStack[ activeStack.length - 1 ].current as Quark

        if (transition) {
            const current   = transition.current

            if (current && current !== PendingQuarkMarker && current !== LazyQuarkMarker && current.hasValue()) {
                current.addEdgeTo(activeQuark, this.candidate)

                return current.value
            }
        } else {
            const latest    = this.baseRevision.getLatestQuarkFor(identifier)

            if (latest === LazyQuarkMarker) {
                transition  = getTransitionClass(identifier).new({ previous : latest, current : MinimalQuark.new({ identifier }), edgesFlow : 1e9 })

                this.transitions.set(identifier, transition)
            } else {
                latest.addEdgeTo(activeQuark, this.candidate)

                return latest.value
            }
        }

        const current   = transition.current

        let currentTransitionQuark : Quark

        if (current === PendingQuarkMarker || current === LazyQuarkMarker)
            currentTransitionQuark  = transition.current = MinimalQuark.new({ identifier })
        else
            currentTransitionQuark  = current

        // the `currentTransitionQuark` is being used as part of the `currentQuark` calculation (is being read from it)
        currentTransitionQuark.addEdgeTo(activeQuark, this.candidate)

        this.stackSync.push(transition)

        this.calculateTransitionsStackSync(this.stackSync, this.onEffectSync)

        if (!currentTransitionQuark.hasValue) throw new Error('todo')

        return currentTransitionQuark.value
    }


    call (calculatedValue : ImpureCalculatedValueGen, args : any[]) {
        if (this.isClosed) throw new Error("Can not 'call' to closed transaction")

        const variableQuark     = UserInputQuark.new({ identifier : calculatedValue, value : args })

        this.candidate.proposed.set(calculatedValue, variableQuark)

        const previousProposed  = this.baseRevision.proposed.get(calculatedValue)

        previousProposed && this.walkContext.continueFrom([ previousProposed ])
    }


    write (variable : Variable, value : any) {
        if (this.isClosed) throw new Error("Can not 'write' to closed transaction")

        const variableQuark     = MinimalQuark.new({ identifier : variable, value : value })

        this.touch(variable, variableQuark)
    }


    touch (identifier : Identifier, currentQuark : QuarkEntry | PendingQuarkMarker = identifier.lazy ? LazyQuarkMarker : PendingQuarkMarker) {
        // TODO handle write to already dirty ???
        if (this.transitions.has(identifier)) return

        const previous      = this.checkout.get(identifier)

        const transition : QuarkTransition = getTransitionClass(identifier).new({ identifier, previous, current : currentQuark, edgesFlow : 1e9 })

        this.transitions.set(identifier, transition)

        if (previous) {
            // already existing identifier, will be added to `mainStack` in the `onTopologicalNode` handler of the walk context
            if (previous !== LazyQuarkMarker) this.walkContext.continueFrom([ previous ])
        } else {
            // newly created identifier, adding to `mainStack` manually
            if (!identifier.lazy) this.stackGen.push(transition)
        }
    }


    removeIdentifier (identifier : Identifier) {
        if (this.transitions.has(identifier)) {
            // removing the "dirty" identifier
            // TODO
        } else {
            this.touch(identifier, TombstoneQuark.new({ identifier }))
        }
    }


    populateCandidateScopeFromTransitions (candidate : Revision, transitions : Map<Identifier, QuarkTransition>) {
        if (candidate.scope.size === 0) {
            // in this branch we can overwrite the whole map

            // this version is ~100ms faster than the one with allocation of intermediate array:
            // Array.from(this.transitions.entries()).map(([ key, value ]) => [ key, value.current ])
            candidate.scope     = new Map(
                map<[ Identifier, QuarkTransition ], [ Identifier, QuarkEntry ]>(
                    transitions.entries(),
                    ([ identifier, transition ]) => [ identifier, transition.current as QuarkEntry ]
                )
            )
        } else {
            // in this branch candidate's scope already has some content - this is the case for calculating lazy values

            // TODO benchmark what is faster (for small maps) - `map.forEach(entry => {})` or `for (const entry of map) {}`
            transitions.forEach((transition : QuarkTransition, identifier : Identifier) => {
                candidate.scope.set(identifier, transition.current as QuarkEntry)
            })
        }
    }


    propagate () : Revision {
        if (this.isClosed) throw new Error('Can not propagate closed revision')

        this.isClosed   = true

        const candidate = this.candidate

        runSyncWithEffect<[ QuarkTransition[] ], any, any>(
            this.onEffectSync,
            this.calculateTransitionsStackGen,
            [ this.stackGen ],
            this
        )

        this.populateCandidateScopeFromTransitions(candidate, this.transitions)

        return candidate
    }


    async propagateAsync () : Promise<Revision> {
        if (this.isClosed) throw new Error('Can not propagate closed revision')

        this.isClosed   = true

        const candidate = this.candidate

        await runAsyncWithEffect<[ QuarkTransition[] ], any, any>(
            this.onEffectAsync,
            this.calculateTransitionsStackGen,
            [ this.stackGen ],
            this
        )

        this.populateCandidateScopeFromTransitions(candidate, this.transitions)

        return candidate
    }


    [ProposedValueSymbol] (effect : ProposedValueEffect, quark : Quark) {
        const identifier : ImpureCalculatedValueGen = effect[ 2 ]

        const userInputQuark    = this.candidate.getLatestProposedQuarkFor(identifier)

        if (userInputQuark) {
            userInputQuark.addEdgeTo(quark, this.candidate)

            return userInputQuark.value[ 0 ]

        } else {
            return undefined
        }
    }


    [CurrentProposedValueSymbol] (effect : CurrentProposedValueEffect, quark : Quark) {
        const identifier : ImpureCalculatedValueGen = effect[ 2 ]

        const userInputQuark    = this.candidate.proposed.get(identifier)

        if (userInputQuark) {
            userInputQuark.addEdgeTo(quark, this.candidate)

            return userInputQuark.value[ 0 ]

        } else {
            return undefined
        }
    }


    * calculateTransitionsStackGen (stack : QuarkTransition[]) : IterableIterator<any> {
        const { transitions, checkout, candidate, dimension } = this

        while (stack.length) {
            const transition        = stack[ stack.length - 1 ]
            const identifier        = transition.identifier

            if (transition.edgesFlow == 0) {
                transition.edgesFlow--

                transitions.delete(identifier)

                const previousQuark = transition.previous

                if (previousQuark !== LazyQuarkMarker) {
                    previousQuark.forEachOutgoingInDimension(checkout, dimension, (label : any, quark : Quark) => {
                        transitions.get(quark.identifier).edgesFlow--
                    })
                }

                stack.pop()
                continue
            }

            let quark : Quark

            if (transition.current === PendingQuarkMarker) {
                quark               = transition.current = MinimalQuark.new({ identifier })
            } else
                quark               = transition.current as Quark

            if (quark.hasValue() || transition.edgesFlow < 0) {
                stack.pop()
                continue
            }

            let iterationResult : IteratorResult<any>   = transition.isCalculationStarted() ? transition.iterationResult : transition.startCalculation(this)

            do {
                const value         = iterationResult.value

                if (iterationResult.done) {
                    quark.value                     = value

                    const previousQuark             = transition.previous

                    if (previousQuark && previousQuark !== LazyQuarkMarker && quark.identifier.equality(value, previousQuark.value)) {
                        // in case the new value is equal to previous, we still need to consider the case
                        // that the incoming dependencies of this identifier has changed (even that the value has not)
                        // TODO write test for this case, need to test the identifiers, that depends on such idents (copy outgoing edges from previous?)

                        previousQuark.forEachOutgoingInDimension(checkout, dimension, (label : any, quark : Quark) => {
                            transitions.get(quark.identifier).edgesFlow--
                        })
                    }

                    stack.pop()
                    break
                }
                else if (value instanceof Identifier) {
                    let requestedTransition     = transitions.get(value)

                    let requestedQuark          = requestedTransition ? requestedTransition.current : checkout.get(value)

                    if (!requestedQuark) throw new Error(`Unknown identifier ${value}`)

                    if (requestedQuark === PendingQuarkMarker) {
                        requestedQuark          = requestedTransition.current = MinimalQuark.new({ identifier : value })
                    }
                    else
                        if (requestedQuark === LazyQuarkMarker) {
                            requestedQuark      = MinimalQuark.new({ identifier : value })

                            if (requestedTransition) {
                                requestedTransition.current = requestedQuark
                            } else {
                                requestedTransition = getTransitionClass(value).new({ identifier : value, previous : LazyQuarkMarker, current : requestedQuark, edgesFlow : 1e9 })

                                transitions.set(value, requestedTransition)
                            }
                        }

                    requestedQuark.addEdgeTo(quark, candidate)

                    if (!requestedTransition || requestedQuark.hasValue()) {
                        iterationResult         = transition.continueCalculation(requestedQuark.value)
                    }
                    else if (!requestedTransition.isCalculationStarted()) {
                        stack.push(requestedTransition)

                        break
                    }
                    else {
                        throw new Error("cycle")
                        // cycle - the requested quark has started calculation (means it was encountered in this loop before)
                        // but the calculation did not complete yet (even that requested quark is calculated before the current)
                        // yield GraphCycleDetectedEffect.new()
                    }
                }
                else if (value && value[ 0 ] === BuiltInEffectSymbol) {
                    const effectResult          = this[ value[ 1 ] ](value, quark)

                    iterationResult             = transition.continueCalculation(effectResult)
                }
                else {
                    // bypass the unrecognized effect to the outer context
                    iterationResult             = transition.continueCalculation(yield value)
                }

            } while (true)
        }
    }


    // THIS METHOD HAS TO BE KEPT SYNCED WITH THE `calculateTransitionsStackGen` !!!
    calculateTransitionsStackSync (stack : QuarkTransition[], onEffect : SyncEffectHandler) {
        const { transitions, checkout, candidate, dimension } = this

        while (stack.length) {
            const transition        = stack[ stack.length - 1 ]
            const identifier        = transition.identifier

            if (transition.edgesFlow == 0) {
                transition.edgesFlow--

                transitions.delete(identifier)

                const previousQuark = transition.previous

                if (previousQuark !== LazyQuarkMarker) {
                    previousQuark.forEachOutgoingInDimension(checkout, dimension, (label : any, quark : Quark) => {
                        transitions.get(quark.identifier).edgesFlow--
                    })
                }

                stack.pop()
                continue
            }

            let quark : Quark

            if (transition.current === PendingQuarkMarker) {
                quark               = transition.current = MinimalQuark.new({ identifier })
            } else
                quark               = transition.current as Quark

            if (quark.hasValue() || transition.edgesFlow < 0) {
                stack.pop()
                continue
            }

            let iterationResult : IteratorResult<any>   = transition.isCalculationStarted() ? transition.iterationResult : transition.startCalculation(this)

            do {
                const value         = iterationResult.value

                if (iterationResult.done) {
                    quark.value                     = value

                    const previousQuark             = transition.previous

                    if (previousQuark && previousQuark !== LazyQuarkMarker && quark.identifier.equality(value, previousQuark.value)) {
                        // in case the new value is equal to previous, we still need to consider the case
                        // that the incoming dependencies of this identifier has changed (even that the value has not)
                        // TODO write test for this case, need to test the identifiers, that depends on such idents (copy outgoing edges from previous?)

                        previousQuark.forEachOutgoingInDimension(checkout, dimension, (label : any, quark : Quark) => {
                            transitions.get(quark.identifier).edgesFlow--
                        })
                    }

                    stack.pop()
                    break
                }
                else if (value instanceof Identifier) {
                    let requestedTransition     = transitions.get(value)

                    let requestedQuark          = requestedTransition ? requestedTransition.current : checkout.get(value)

                    if (!requestedQuark) throw new Error(`Unknown identifier ${value}`)

                    if (requestedQuark === PendingQuarkMarker) {
                        requestedQuark          = requestedTransition.current = MinimalQuark.new({ identifier : value })
                    }
                    else
                        if (requestedQuark === LazyQuarkMarker) {
                            requestedQuark      = MinimalQuark.new({ identifier : value })

                            if (requestedTransition) {
                                requestedTransition.current = requestedQuark
                            } else {
                                requestedTransition = getTransitionClass(value).new({ identifier : value, previous : LazyQuarkMarker, current : requestedQuark, edgesFlow : 1e9 })

                                transitions.set(value, requestedTransition)
                            }
                        }

                    requestedQuark.addEdgeTo(quark, candidate)

                    if (!requestedTransition || requestedQuark.hasValue()) {
                        iterationResult         = transition.continueCalculation(requestedQuark.value)
                    }
                    else if (!requestedTransition.isCalculationStarted()) {
                        stack.push(requestedTransition)

                        break
                    }
                    else {
                        throw new Error("cycle")
                        // cycle - the requested quark has started calculation (means it was encountered in this loop before)
                        // but the calculation did not complete yet (even that requested quark is calculated before the current)
                        // yield GraphCycleDetectedEffect.new()
                    }
                }
                else {
                    // bypass the unrecognized effect to the outer context
                    iterationResult             = transition.continueCalculation(onEffect(value))
                }

            } while (true)
        }
    }
}

export type Transaction = Mixin<typeof Transaction>

export class MinimalTransaction extends Transaction(Base) {}
