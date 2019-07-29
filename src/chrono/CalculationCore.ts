import { Identifier } from "../primitives/Identifier.js"
import { Scope } from "./Checkout.js"
import { LazyQuarkMarker, MinimalQuark, Quark } from "./Quark.js"
import { Revision } from "./Revision.js"
import { QuarkTransition } from "./Transaction.js"

export type CalculationArgs = {
    stack               : Quark[],
    transitions         : Map<Identifier, QuarkTransition>,
    checkout            : Scope,
    candidate           : Revision,
    dimension           : Revision[]
}

export function* calculateTransitions<YieldT, ResultT> (args : CalculationArgs) : IterableIterator<YieldT | Map<Identifier, QuarkTransition>> {
    const { stack, transitions, checkout, candidate, dimension } = args

    while (stack.length) {
        const quark : Quark     = stack[ stack.length - 1 ]

        const transition        = transitions.get(quark.identifier)

        if (quark.isCalculationCompleted() || transition.edgesFlow < 0) {
            stack.pop()
            continue
        }

        let iterationResult : IteratorResult<any>

        if (quark.isCalculationStarted()) {
            iterationResult     = quark.iterationResult
        } else {
            if (transition.edgesFlow == 0) {
                transition.edgesFlow--

                const previousQuark = transition.previous

                if (previousQuark !== LazyQuarkMarker) {
                    // TODO remove the "current" property from the transition, to indicate that "previous" should be used
                    quark.forceValue(previousQuark.value)

                    previousQuark.forEachOutgoingInDimension(checkout, dimension, (label : any, quark : Quark) => {
                        transitions.get(quark.identifier).edgesFlow--
                    })
                }

                stack.pop()
                continue
            } else {
                iterationResult = quark.startCalculation()
            }
        }

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
                const requestedTransition   = transitions.get(value)

                let requestedQuark          = requestedTransition ? requestedTransition.current : checkout.get(value)

                if (!requestedQuark) throw new Error(`Unknown identifier ${value}`)

                if (requestedQuark === LazyQuarkMarker) {
                    requestedQuark          = MinimalQuark.new({ identifier : value })

                    if (requestedTransition) {
                        requestedTransition.current = requestedQuark
                    } else {
                        transitions.set(value, { previous : LazyQuarkMarker, current : requestedQuark, edgesFlow : 1e9 })
                    }
                }

                requestedQuark.addEdgeTo(quark, candidate)

                if (requestedQuark.isCalculationCompleted()) {
                    iterationResult         = quark.supplyYieldValue(requestedQuark.value)
                }
                else if (!requestedQuark.isCalculationStarted()) {
                    stack.push(requestedQuark)

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
