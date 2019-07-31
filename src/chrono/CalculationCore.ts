import { Identifier } from "../primitives/Identifier.js"
import { Scope } from "./Checkout.js"
import { LazyQuarkMarker, MinimalQuark, PendingQuarkMarker, Quark } from "./Quark.js"
import { Revision } from "./Revision.js"
import { QuarkTransition } from "./Transaction.js"


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

        if (quark.isCalculationCompleted() || transition.edgesFlow < 0) {
            stack.pop()
            continue
        }

        let iterationResult : IteratorResult<any>

        if (quark.isCalculationStarted())
            iterationResult     = quark.iterationResult
        else
            iterationResult     = quark.startCalculation()

        do {
            const value         = iterationResult.value

            if (iterationResult.done) {
                // garbage collect the generator instances
                quark.iterator                  = undefined
                // for some reason, it seems, the last called generator instance
                // installs itself as the prototype property of the generator function
                quark.calculation.prototype     = undefined

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
                            requestedTransition = { identifier : value, previous : LazyQuarkMarker, current : requestedQuark, edgesFlow : 1e9 }

                            transitions.set(value, requestedTransition)
                        }
                    }

                requestedQuark.addEdgeTo(quark, candidate)

                if (requestedQuark.isCalculationCompleted()) {
                    iterationResult         = quark.supplyYieldValue(requestedQuark.value)
                }
                else if (!requestedQuark.isCalculationStarted()) {
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
                iterationResult             = quark.supplyYieldValue(yield value)
            }

        } while (true)
    }

    return transitions
}
