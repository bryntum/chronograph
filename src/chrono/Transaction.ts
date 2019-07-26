import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { map } from "../collection/Iterator.js"
import { OnCycleAction, WalkContext, WalkStep } from "../graph/WalkDepth.js"
import { Box } from "../primitives/Box.js"
import { Calculation } from "../primitives/Calculation.js"
import { Identifier, Variable } from "../primitives/Identifier.js"
import { lazyProperty } from "../util/Helper.js"
import { MinimalQuark, Quark, TombstoneQuark } from "./Quark.js"
import { MinimalRevision, Revision } from "./Revision.js"


type QuarkTransition    = { previous : Quark, current : Quark, edgesFlow : number }

//---------------------------------------------------------------------------------------------------------------------
export class WalkForwardQuarkContext<Label = any> extends WalkContext<Quark, Label> {
    checkout        : Map<Identifier, Quark>

    scope           : Map<Identifier, QuarkTransition>

    walkDimension   : Revision[] = []


    forEachNext (node : Quark, func : (label : Label, node : Quark) => any) {
        node.forEachOutgoingInDimension(this.checkout, this.walkDimension, (label : Label, node : Quark) => {
            let transition      = this.scope.get(node.identifier)

            if (!transition) {
                transition      = { previous : node, current : MinimalQuark.new({ identifier : node.identifier }), edgesFlow : 0 }

                this.scope.set(node.identifier, transition)
            }

            transition.edgesFlow++

            func(label, node)
        })
    }
}


//---------------------------------------------------------------------------------------------------------------------
export const Transaction = <T extends AnyConstructor<Calculation & Base>>(base : T) =>

class Transaction extends base {
    baseRevision            : Revision

    checkout                : Map<Identifier, Quark>

    // YieldT                  : unknown
    ValueT                  : Map<Identifier, QuarkTransition>

    isClosed                : boolean                   = false

    scope                   : Map<Identifier, QuarkTransition>  = new Map()

    walkContext             : WalkForwardQuarkContext

    mainStack               : Quark[]                   = []


    initialize (...args) {
        super.initialize(...args)

        this.walkContext    = WalkForwardQuarkContext.new({
            checkout        : this.checkout,
            scope           : this.scope,
            walkDimension   : this.dimension,

            // ignore cycles when determining potentially changed atoms
            onCycle         : (quark : Quark, stack : WalkStep<Quark>[]) => OnCycleAction.Resume,

            onTopologicalNode       : (quark : Quark) => {
                this.mainStack.push(this.scope.get(quark.identifier).current)
            }
        })

        // init internal state of the walk context, we'll use `continueFrom` afterwards
        this.walkContext.startFrom([])
    }


    isEmpty () : boolean {
        return this.scope.size === 0
    }


    write (variable : Variable, value : any) {
        if (this.isClosed) throw new Error("Can not write to open transaction")

        const variableQuark     = MinimalQuark.new({ identifier : variable })

        variableQuark.forceValue(value)

        this.touch(variable, variableQuark)
    }


    touch (identifier : Identifier, currentQuark : Quark = MinimalQuark.new({ identifier })) {
        // TODO handle write to already dirty ???
        if (this.scope.has(identifier)) return

        const previous      = this.checkout.get(identifier)

        this.scope.set(identifier, { previous : previous, current : currentQuark, edgesFlow : 1e9 })

        if (previous) {
            this.walkContext.continueFrom([ previous ])
        } else {
            // newly created identifier
            this.mainStack.push(currentQuark)
        }
    }


    removeIdentifier (identifier : Identifier) {
        if (this.scope.has(identifier)) {
            // removing the "dirty" identifier
            // TODO
        } else {
            this.touch(identifier, TombstoneQuark.new({ identifier }))
        }
    }


    propagate (latest : Map<Identifier, Quark>) : Revision {
        this.isClosed   = true

        const candidate = MinimalRevision.new({
            previous    : this.baseRevision
        })

        const transitionScope : Map<Identifier, QuarkTransition> = this.runSyncWithEffect(() => null, candidate, latest)

        candidate.scope     = new Map(
            map<[ Identifier, QuarkTransition ], [ Identifier, Quark ]>(transitionScope.entries(), ([ key, value ]) => [ key, value.current ])
        )

        return candidate
    }


    get dimension () : Revision[] {
        return lazyProperty<this, 'dimension'>(this, '_dimension', () => Array.from(this.baseRevision.thisAndAllPrevious()) )
    }


    ArgsT   : [ Revision,  Map<Identifier, Quark> ]

    * calculation (candidate : Revision, latest : Map<Identifier, Quark>) : this[ 'iterator' ] {
        // const { stack, scope }      = this.determinePotentiallyChangedQuarks(latest)
        const stack     = this.mainStack
        const scope     = this.scope

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

                    previousQuark.forEachOutgoingInDimension(latest, this.dimension, (label : any, quark : Quark) => {
                        scope.get(quark.identifier).edgesFlow--
                    })

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
                    quark.iterator  = undefined
                    // for some reason, it seems, the last called generator instance
                    // installs itself as the prototype property of the generator function
                    quark.calculation.prototype = undefined

                    const previousQuark = transition.previous

                    if (previousQuark && quark.identifier.equality(value, previousQuark.value)) {
                        previousQuark.forEachOutgoingInDimension(latest, this.dimension, (label : any, quark : Quark) => {
                            scope.get(quark.identifier).edgesFlow--
                        })
                    }

                    stack.pop()

                    break
                }
                else if (value instanceof Identifier) {
                    const requestedTransition   = scope.get(value)

                    const requestedQuark        = requestedTransition ? requestedTransition.current : latest.get(value)

                    if (!requestedQuark) throw new Error(`Unknown identifier ${value}`)

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

        return scope
    }
}

export type Transaction = Mixin<typeof Transaction>

export class MinimalTransaction extends Transaction(Calculation(Box(Base))) {
    // YieldT                  : GraphCycleDetectedEffect
    ValueT                  : Map<Identifier, QuarkTransition>
}
