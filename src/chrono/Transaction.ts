import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { OnCycleAction, WalkStep } from "../graph/Walkable.js"
import { Box } from "../primitives/Box.js"
import { Calculation } from "../primitives/Calculation.js"
import { WalkForwardDimensionedNodeContext } from "../graph/DimensionedNode.js"
import { Identifier, Variable } from "../primitives/Identifier.js"
import { BranchNode } from "../primitives/Branch.js"
import { MinimalQuark, Quark } from "./Quark.js"


type QuarkTransition    = { previous : Quark, current : Quark, edgesFlow : number }

//---------------------------------------------------------------------------------------------------------------------
export const Transaction = <T extends AnyConstructor<BranchNode & Calculation>>(base : T) =>

class Transaction extends base {
    previous                : Transaction

    // YieldT                  : unknown
    ValueT                  : Map<Identifier, QuarkTransition>

    isClosed                : boolean                   = false
    isFrozen                : boolean                   = false

    variablesData           : Map<Identifier, any>      = new Map()

    touchedIdentifiers      : Map<Identifier, Quark>    = new Map()

    scope                   : Map<Identifier, QuarkTransition> = new Map()


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
            identifier          : quark.identifier
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

            if (quark) return quark.current

            previous    = previous.previous
        }

        return null
    }


    getLatestQuarkFor (identifier : Identifier) : Quark {
        const current       = this.scope.get(identifier)

        if (current) return current.current

        return this.getPreviousQuarkFor(identifier)
    }


    getDimensionBranch () {
        return this.branch.isEmpty() ? this.branch.baseBranch : this.branch
    }


    determinePotentiallyChangedQuarks () : { stack : Quark[], scope : Map<Identifier, QuarkTransition> } {
        const scope : Map<Identifier, QuarkTransition>  = new Map()

        const startFrom : Quark[]                       = []

        this.touchedIdentifiers.forEach((quark, identifier) => {
            if (quark) {
                startFrom.push(quark)
            } else {
                const newQuark      = MinimalQuark.new({ identifier })

                scope.set(newQuark.identifier, { previous : null, current : newQuark, edgesFlow : 1 })
            }
        })

        WalkForwardDimensionedNodeContext.new({
            walkDimension           : this.getDimensionBranch(),

            // ignore cycles when determining potentially changed atoms
            onCycle                 : (quark : Quark, stack : WalkStep<Quark>[]) => OnCycleAction.Resume,

            onTopologicalNode       : (quark : Quark) => {
                const newQuark      = this.derive(quark)

                scope.set(newQuark.identifier, { previous : quark, current : newQuark, edgesFlow : quark.incoming.size })
            }
        }).startFrom(startFrom)

        this.touchedIdentifiers.forEach((quark, identifier) => {
            if (quark) {
                const transition        = scope.get(identifier)

                transition.edgesFlow    = 1
            }
        })

        // since Map preserves the order of addition, `stack` will be in topo-sorted order as well
        return { stack : Array.from(scope.values()).map(transition => transition.current), scope }
    }


    * calculation (...args : any[]) : this[ 'iterator' ] {
        const { stack, scope }      = this.determinePotentiallyChangedQuarks()

        while (stack.length) {
            const quark : Quark     = stack[ stack.length - 1 ]

            const transition        = scope.get(quark.identifier)

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

                    quark.forceValue(previousQuark.value)

                    previousQuark.forEachOutgoingInDimension(this.getDimensionBranch(), (label : any, quark : Quark) => {
                        scope.get(quark.identifier).edgesFlow--
                    })

                    stack.pop()
                    continue
                } else {
                    iterationResult = quark.startCalculation(this.variablesData.get(quark.identifier))
                }
            }

            do {
                const value         = iterationResult.value

                if (iterationResult.done) {
                    const previousQuark = transition.previous

                    if (previousQuark && quark.identifier.equality(value, previousQuark.value)) {
                        previousQuark.forEachOutgoingInDimension(this.getDimensionBranch(), (label : any, quark : Quark) => {
                            scope.get(quark.identifier).edgesFlow--
                        })
                    }

                    stack.pop()

                    break
                }
                else if (value instanceof Identifier) {
                    const requestedTransition   = scope.get(value)

                    const requestedQuark        = requestedTransition ? requestedTransition.current : this.getPreviousQuarkFor(value)

                    if (!requestedQuark) throw new Error(`Unknown identifier ${value}`)

                    quark.addEdgeFrom(requestedQuark, this.branch)

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

        return scope
    }
}

export type Transaction = Mixin<typeof Transaction>
// export interface TransactionI extends Mixin<typeof Transaction> {
//     NodeT                   : Transaction
//     // YieldT                  : GraphCycleDetectedEffect
//     ValueT                  : Map<Identifier, Quark>
// }

export class MinimalTransaction extends Transaction(Calculation(Box(BranchNode(Base)))) {
    // YieldT                  : GraphCycleDetectedEffect
    ValueT                  : Map<Identifier, QuarkTransition>
}
