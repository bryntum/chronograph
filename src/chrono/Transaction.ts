import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { OnCycleAction, WalkStep } from "../graph/Walkable.js"
import { Box } from "../primitives/Box.js"
import { Calculation } from "../primitives/Calculation.js"
import { WalkForwardDimensionedNodeContext } from "./DimensionedNode.js"
import { Identifier, Variable } from "../primitives/Identifier.js"
import { lazyProperty } from "../util/Helper.js"
import { MinimalQuark, Quark, TombstoneQuark } from "./Quark.js"
import { MinimalRevision, Revision } from "./Revision.js"


type QuarkTransition    = { previous : Quark, current : Quark, edgesFlow : number }

//---------------------------------------------------------------------------------------------------------------------
export const Transaction = <T extends AnyConstructor<Calculation>>(base : T) =>

class Transaction extends base {
    baseRevision            : Revision

    // YieldT                  : unknown
    ValueT                  : Map<Identifier, QuarkTransition>

    isClosed                : boolean                   = false

    variablesData           : Map<Identifier, any>      = new Map()

    touchedIdentifiers      : Map<Identifier, Quark>    = new Map()
    removedIdentifiers      : Set<Identifier>           = new Set()


    isEmpty () : boolean {
        return this.touchedIdentifiers.size === 0 && this.removedIdentifiers.size === 0
    }


    write (variable : Variable, value : any) {
        if (this.isClosed) throw new Error("Can not write to open transaction")

        this.variablesData.set(variable, value)

        this.touch(variable)
    }


    touch (identifier : Identifier) {
        if (this.touchedIdentifiers.has(identifier)) return

        const previousQuark     = this.baseRevision.getLatestQuarkFor(identifier)

        this.touchedIdentifiers.set(identifier, previousQuark)
    }


    removeIdentifier (identifier : Identifier) {
        this.removedIdentifiers.add(identifier)
    }


    propagate () : Revision {
        this.isClosed   = true

        const candidate = MinimalRevision.new({
            previous    : this.baseRevision
        })

        const transitionScope   = this.runSyncWithEffect(() => null, candidate)

        candidate.scope     = new Map(Array.from(transitionScope.entries()).map(([ key, value ]) => [ key, value.current ]))

        return candidate
    }


    get dimensionBranch () : Set<Revision> {
        return lazyProperty<this, 'dimensionBranch'>(this, '_dimensionBranch', () => new Set(this.baseRevision.thisAndAllPrevious()) )
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
            walkDimension           : this.dimensionBranch,

            // ignore cycles when determining potentially changed atoms
            onCycle                 : (quark : Quark, stack : WalkStep<Quark>[]) => OnCycleAction.Resume,

            onTopologicalNode       : (quark : Quark) => {
                const newQuark      = MinimalQuark.new({ identifier : quark.identifier })

                scope.set(newQuark.identifier, { previous : quark, current : newQuark, edgesFlow : quark.incoming.size })
            }
        }).startFrom(startFrom)

        this.touchedIdentifiers.forEach((quark, identifier) => {
            if (quark) {
                const transition        = scope.get(identifier)

                transition.edgesFlow    = 1
            }
        })

        // removed identifiers will be calculated first
        this.removedIdentifiers.forEach(identifier => {
            scope.set(identifier, { previous : this.baseRevision.getLatestQuarkFor(identifier), current : TombstoneQuark.new({ identifier }), edgesFlow : 1 })
        })


        // since Map preserves the order of addition, `stack` will be in topo-sorted order as well
        return { stack : Array.from(scope.values()).map(transition => transition.current), scope }
    }


    * calculation (candidate : Revision) : this[ 'iterator' ] {
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

                    previousQuark.forEachOutgoingInDimension(this.dimensionBranch, (label : any, quark : Quark) => {
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
                        previousQuark.forEachOutgoingInDimension(this.dimensionBranch, (label : any, quark : Quark) => {
                            scope.get(quark.identifier).edgesFlow--
                        })
                    }

                    stack.pop()

                    break
                }
                else if (value instanceof Identifier) {
                    const requestedTransition   = scope.get(value)

                    const requestedQuark        = requestedTransition ? requestedTransition.current : this.baseRevision.getLatestQuarkFor(value)

                    if (!requestedQuark) throw new Error(`Unknown identifier ${value}`)

                    quark.addEdgeFrom(requestedQuark, candidate)

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

export class MinimalTransaction extends Transaction(Calculation(Box(Base))) {
    // YieldT                  : GraphCycleDetectedEffect
    ValueT                  : Map<Identifier, QuarkTransition>
}
