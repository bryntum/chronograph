import { Base } from "../class/Mixin.js"
import { Box } from "../primitives/Box.js"
import { Calculation, CalculationFunction } from "../primitives/Calculation.js"
import { Identifier } from "../primitives/Identifier.js"
import { MinimalQuark, Quark } from "./Quark.js"
import { Revision } from "./Revision.js"


//---------------------------------------------------------------------------------------------------------------------
export const LazyQuarkMarker        = Symbol('LazyQuarkMarker')
export type LazyQuarkMarker         = typeof LazyQuarkMarker

export const PendingQuarkMarker     = Symbol('PendingQuarkMarker')
export type PendingQuarkMarker      = typeof PendingQuarkMarker


//---------------------------------------------------------------------------------------------------------------------
export type QuarkEntry              = Quark | LazyQuarkMarker
export type Scope                   = Map<Identifier, QuarkEntry>

//---------------------------------------------------------------------------------------------------------------------
export class QuarkTransition extends Calculation(Box(Base)) {
    identifier      : Identifier

    previous        : QuarkEntry
    current         : QuarkEntry | PendingQuarkMarker

    edgesFlow       : number


    get calculation () : CalculationFunction {
        return this.identifier.calculation
    }


    get calculationContext () : any {
        return this.identifier.calculationContext
    }
}

//---------------------------------------------------------------------------------------------------------------------
export type CalculationArgs = {
    stack               : QuarkTransition[],
    transitions         : Map<Identifier, QuarkTransition>,
    checkout            : Scope,
    candidate           : Revision,
    dimension           : Revision[]
}

export function* calculateTransitions<YieldT, ResultT> (args : CalculationArgs) : IterableIterator<YieldT | Map<Identifier, QuarkTransition>> {
    const { stack, transitions, checkout, candidate, dimension } = args

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

        let iterationResult : IteratorResult<any>   = transition.isCalculationStarted() ? transition.iterationResult : transition.startCalculation()

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
                            requestedTransition = QuarkTransition.new({ identifier : value, previous : LazyQuarkMarker, current : requestedQuark, edgesFlow : 1e9 })

                            transitions.set(value, requestedTransition)
                        }
                    }

                requestedQuark.addEdgeTo(quark, candidate)

                if (!requestedTransition || requestedQuark.hasValue()) {
                    iterationResult         = transition.supplyYieldValue(requestedQuark.value)
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
                iterationResult             = transition.supplyYieldValue(yield value)
            }

        } while (true)
    }

    return transitions
}
