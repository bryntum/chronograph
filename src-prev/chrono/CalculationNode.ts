import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { MinimalNode, Node, WalkForwardContext } from "../graph/Node.js"
import { cycleInfo, OnCycleAction, WalkStep } from "../graph/Walkable.js"
import { Box } from "./Box.js"
import { ChronoCalculation, ChronoIterator, ChronoValue } from "./Calculation.js"
import { Effect, NotChanged } from "./Effect.js"


//---------------------------------------------------------------------------------------------------------------------
export class CalculationNodePropagation extends Base {
    // updatedCalculationNodes           : Map<CalculationNode, CalculationNode>            = new Map()
}


//---------------------------------------------------------------------------------------------------------------------
export class CalculationCycle extends Effect {
    // source              : CalculationNodeI
}


// //---------------------------------------------------------------------------------------------------------------------
// export class InputMarker extends CalculationNode {
//     atom            : ChronoAtom
// }


const isChronoCalculationSymbol = Symbol('isChronoCalculationSymbol')

//---------------------------------------------------------------------------------------------------------------------
export const CalculationNode = <T extends AnyConstructor<Node & ChronoCalculation>>(base : T) =>

class CalculationNode extends base {
    [isChronoCalculationSymbol] () {}

    NodeT                   : CalculationNode
    LabelT                  : ChronoValue[]

    ValueT                  : any

    YieldT                  : CalculationCycle

    // revision                : RevisionNode  = RevisionNode.new()
    // basedOn                 : RevisionNode

    protected isOpened      : boolean       = true

    // // `Map` preserves the order of addition, so this data is also ordered
    // proposedData            : Map<CalculationNode, ChronoValue[]>    = new Map()



    // put (...args : this[ 'ArgsT' ]) {
    //     this.addProposedCalculationNode(this, args)
    // }


    addProposedCalculationNode (node : CalculationNode, args? : any[]) {
        this.addEdgeFrom(node, args)
    }


    getProposedDataFor (node : CalculationNode) {
        return this.getLabelFrom(node)
    }


    close () {
        this.isOpened   = false
    }


    onEffect (effect : this[ 'YieldT' ]) {

    }


    * calculation (...args : this[ 'ArgsT' ]) : ChronoIterator<CalculationCycle | CalculationNodePropagation> {
        this.close()

        const calculationStack : CalculationNode[] = Array.from(this.incoming.keys())

        while (calculationStack.length) {
            const calculationNode : CalculationNode   = calculationStack[ calculationStack.length - 1 ]

            if (calculationNode.isCalculationCompleted()) {
                calculationStack.pop()
                continue
            }

            let iterationResult : IteratorResult<any>   = calculationNode.isCalculationStarted() ? calculationNode.iterationResult : calculationNode.startCalculation()

            do {
                const value                     = iterationResult.value

                if (iterationResult.done) {
                    calculationStack.pop()

                    break
                }
                else if (isCalculationNode(value)) {
                    const requestedCalculationNode  = value

                    calculationNode.addEdgeFrom(requestedCalculationNode)

                    if (!requestedCalculationNode.isCalculationStarted()) {
                        calculationStack.push(requestedCalculationNode)

                        break
                    }
                    else if (requestedCalculationNode.isCalculationCompleted()) {
                        iterationResult     = calculationNode.supplyYieldValue(requestedCalculationNode.value)
                    }
                    else {
                        // yield started, but not completed calculations to outer context
                        iterationResult     = calculationNode.supplyYieldValue(yield value)
                    }
                }
                else {
                    // bypass the unrecognized effect to the outer context
                    iterationResult         = calculationNode.supplyYieldValue(yield value)
                }

            } while (true)
        }

        return this
    }
}

export type CalculationNode = Mixin<typeof CalculationNode>
export interface CalculationNodeI extends Mixin<typeof CalculationNode> {
    NodeT                   : CalculationNode
    YieldT                  : CalculationCycle
    LabelT                  : ChronoValue[]
}

export class MinimalCalculationNode extends CalculationNode(ChronoCalculation(Box(MinimalNode))) {
    NodeT                   : CalculationNode
    YieldT                  : CalculationCycle
    LabelT                  : ChronoValue[]
}

//---------------------------------------------------------------------------------------------------------------------
export const isCalculationNode = (value : any) : value is CalculationNode => Boolean(value && value[ isChronoCalculationSymbol ])
