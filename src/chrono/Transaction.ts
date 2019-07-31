import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { map } from "../collection/Iterator.js"
import { OnCycleAction, WalkContext, WalkStep } from "../graph/WalkDepth.js"
import { Box } from "../primitives/Box.js"
import { Calculation, CalculationFunction, runSyncWithEffect } from "../primitives/Calculation.js"
import { Identifier, Variable } from "../primitives/Identifier.js"
import { calculateTransitions, CalculationArgs } from "./CalculationCore.js"
import { QuarkEntry, Scope } from "./Checkout.js"
import { LazyQuarkMarker, MinimalQuark, PendingQuarkMarker, Quark, TombstoneQuark } from "./Quark.js"
import { MinimalRevision, Revision } from "./Revision.js"


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
export class WalkForwardQuarkContext<Label = any> extends WalkContext<Quark, Label> {
    checkout        : Scope

    transitions     : Map<Identifier, QuarkTransition>

    walkDimension   : Revision[] = []


    forEachNext (node : Quark, func : (label : Label, node : Quark) => any) {
        node.forEachOutgoingInDimension(this.checkout, this.walkDimension, (label : Label, node : Quark) => {
            let transition      = this.transitions.get(node.identifier)

            if (!transition) {
                const current   = node.identifier.lazy ? LazyQuarkMarker : PendingQuarkMarker

                transition      = QuarkTransition.new({ identifier : node.identifier, previous : node, current : current, edgesFlow : 0 })

                this.transitions.set(node.identifier, transition)
            }

            transition.edgesFlow++

            func(label, node)
        })
    }
}


//---------------------------------------------------------------------------------------------------------------------
export const Transaction = <T extends AnyConstructor<Base>>(base : T) =>

class Transaction extends base {
    baseRevision            : Revision

    checkout                : Scope

    isClosed                : boolean                   = false

    transitions             : Map<Identifier, QuarkTransition>  = new Map()

    walkContext             : WalkForwardQuarkContext

    mainStack               : QuarkTransition[]         = []


    initialize (...args) {
        super.initialize(...args)

        this.walkContext    = WalkForwardQuarkContext.new({
            checkout        : this.checkout,
            transitions     : this.transitions,
            walkDimension   : Array.from(this.baseRevision.thisAndAllPrevious()),

            // ignore cycles when determining potentially changed atoms
            onCycle         : (quark : Quark, stack : WalkStep<Quark>[]) => OnCycleAction.Resume,

            onTopologicalNode       : (quark : Quark) => {
                if (!quark.identifier.lazy) this.mainStack.push(this.transitions.get(quark.identifier))
            }
        })

        // init internal state of the walk context, we'll use `continueFrom` afterwards
        this.walkContext.startFrom([])
    }


    isEmpty () : boolean {
        return this.transitions.size === 0
    }


    write (variable : Variable, value : any) {
        if (this.isClosed) throw new Error("Can not write to open transaction")

        const variableQuark     = MinimalQuark.new({ identifier : variable, value : value })

        this.touch(variable, variableQuark)
    }


    touch (identifier : Identifier, currentQuark : QuarkEntry = identifier.lazy ? LazyQuarkMarker : MinimalQuark.new({ identifier })) {
        // TODO handle write to already dirty ???
        if (this.transitions.has(identifier)) return

        const previous      = this.checkout.get(identifier)

        const transition : QuarkTransition = QuarkTransition.new({ identifier, previous, current : currentQuark, edgesFlow : 1e9 })

        this.transitions.set(identifier, transition)

        if (previous) {
            // already existing identifier, will be added to `mainStack` in the `onTopologicalNode` handler of the walk context
            if (previous !== LazyQuarkMarker) this.walkContext.continueFrom([ previous ])
        } else {
            // newly created identifier, adding to `mainStack` manually
            if (!identifier.lazy) this.mainStack.push(transition)
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


    propagate () : Revision {
        this.isClosed   = true

        const candidate = MinimalRevision.new({
            previous    : this.baseRevision
        })

        runSyncWithEffect<[ CalculationArgs ], any, any>(
            x => x,
            calculateTransitions,
            [
                {
                    stack           : this.mainStack,
                    transitions     : this.transitions,

                    candidate       : candidate,
                    checkout        : this.checkout,
                    dimension       : Array.from(this.baseRevision.thisAndAllPrevious())
                }
            ]
        )
        // const transitionScope : Map<Identifier, QuarkTransition> = this.runSyncWithEffect(() => null, candidate)

        // this version is ~100ms faster than the one with allocation of intermediate array:
        // Array.from(this.transitions.entries()).map(([ key, value ]) => [ key, value.current ])
        candidate.scope     = new Map(
            map<[ Identifier, QuarkTransition ], [ Identifier, QuarkEntry ]>(this.transitions.entries(), ([ key, value ]) => [ key, value.current as QuarkEntry ])
        )

        return candidate
    }
}

export type Transaction = Mixin<typeof Transaction>

export class MinimalTransaction extends Transaction(Calculation(Box(Base))) {}
