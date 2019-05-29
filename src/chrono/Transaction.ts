import { AnyConstructor, Mixin } from "../class/Mixin.js"
import { MinimalNode, WalkForwardContext } from "../graph/Node.js"
import { OnCycleAction, WalkStep } from "../graph/Walkable.js"
import { Box } from "../primitives/Box.js"
import { Calculation, CalculationIterator } from "../primitives/Calculation.js"
import { Identifier, Variable } from "../primitives/Identifier.js"
import { RevisionNode } from "../primitives/Revision.js"
import { MinimalQuark, Quark } from "./Quark.js"


//---------------------------------------------------------------------------------------------------------------------
export const Transaction = <T extends AnyConstructor<RevisionNode & Calculation>>(base : T) =>

class Transaction extends base {
    NodeT                   : Transaction

    // YieldT                  : GraphCycleDetectedEffect
    ValueT                  : Map<Identifier, Quark>

    isClosed                : boolean                   = false
    isFrozen                : boolean                   = false

    variablesData           : Map<Identifier, any>      = new Map()

    touchedIdentifiers      : Map<Identifier, Quark>    = new Map()

    scope                   : Map<Identifier, Quark>    = new Map()


    read (identifier : Identifier) : any {
        if (!this.isFrozen) throw new Error("Can only read from frozen transaction")

        const latest    = this.getLatestQuarkFor(identifier)

        if (!latest) throw new Error("Unknown identifier")

        return latest.value
    }


    write (variable : Variable, value : any) {
        if (this.isClosed) throw new Error("Can not write to open transaction")

        this.variablesData.set(variable, value)

        this.touch(variable)
    }


    touch (identifier : Identifier) {
        if (this.touchedIdentifiers.has(identifier)) return

        const previousQuark     = this.getLatestQuarkFor(identifier)

        this.touchedIdentifiers.set(identifier, previousQuark)
    }


    derive (quark : Quark) : Quark {
        return MinimalQuark.new({
            previous            : quark,
            identifier          : quark.identifier,
            revision            : this
        })
    }


    propagate () {
        this.isClosed   = true

        this.scope      = this.runSyncWithEffect(() => null)

        this.isFrozen   = true
    }


    getPreviousQuarkFor (identifier : Identifier) : Quark {
        let previous    = this.previous

        while (previous) {
            const quark = previous.scope.get(identifier)

            if (quark) return quark

            previous    = previous.previous
        }

        return null
    }


    getLatestQuarkFor (identifier : Identifier) : Quark {
        const current       = this.scope.get(identifier)

        if (current) return current

        return this.getPreviousQuarkFor(identifier)
    }


    determinePotentiallyChangedQuarks () : { stack : Quark[], scope : Map<Identifier, Quark> } {
        const scope : Map<Identifier, Quark>    = new Map()

        const startFrom                         = []

        this.touchedIdentifiers.forEach((latestQuark, identifier) => {
            if (latestQuark) {
                startFrom.push(latestQuark)
            } else {
                const newQuark      = MinimalQuark.new({ identifier, revision : this })

                scope.set(newQuark.identifier, newQuark)
            }
        })

        WalkForwardContext.new({
            // ignore cycles when determining potentially changed atoms
            onCycle                 : (node : Quark, stack : WalkStep<Quark>[]) => OnCycleAction.Resume,

            onTopologicalNode       : (quark : Quark) => {
                const newQuark      = this.derive(quark)

                scope.set(newQuark.identifier, newQuark)
            }
        }).startFrom(startFrom)

        // since Map preserves the order of addition, `stack` will be in topo-sorted order as well
        return { stack : Array.from(scope.values()), scope }
    }


    * calculation (...args : any[]) : CalculationIterator {
        const { stack, scope }      = this.determinePotentiallyChangedQuarks()

        while (stack.length) {
            const quark : Quark     = stack[ stack.length - 1 ]

            if (quark.isCalculationCompleted()) {
                stack.pop()
                continue
            }

            let iterationResult : IteratorResult<any>   =
                quark.isCalculationStarted() ? quark.iterationResult : quark.startCalculation(this.variablesData.get(quark.identifier))

            do {
                const value         = iterationResult.value

                if (iterationResult.done) {

                    // if (value === NotChanged || calculationQuark.equality(value, calculationQuark.value)) {
                    //     // TODO calculated the same value
                    //     // remove the quark and its descendants from the `calculationQuarks` map to indicate it did not change
                    // }

                    stack.pop()

                    break
                }
                else if (value instanceof Identifier) {
                    const requestedQuark    = scope.get(value) || this.getPreviousQuarkFor(value)

                    quark.addEdgeFrom(requestedQuark)

                    if (!requestedQuark) {
                        throw new Error("Unknown identifier")
                    }
                    else if (!requestedQuark.isCalculationStarted()) {
                        stack.push(requestedQuark)

                        break
                    }
                    else if (requestedQuark.isCalculationCompleted()) {
                        iterationResult     = quark.supplyYieldValue(requestedQuark.value)
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
                    iterationResult         = quark.supplyYieldValue(yield value)
                }

            } while (true)
        }

        return scope
    }
}

export type Transaction = Mixin<typeof Transaction>
// export interface TransactionI extends Mixin<typeof Transaction> {
//     NodeT                   : Transaction
//     // YieldT                  : GraphCycleDetectedEffect
//     ValueT                  : Map<Identifier, Quark>
// }

export class MinimalTransaction extends Transaction(Calculation(Box(RevisionNode(MinimalNode)))) {
    NodeT                   : Transaction
    // YieldT                  : GraphCycleDetectedEffect
    ValueT                  : Map<Identifier, Quark>
}
