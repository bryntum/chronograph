import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { MinimalNode, Node, WalkableBackwardNode, WalkableForwardNode } from "../graph/Node.js"
import { Box } from "../primitives/Box.js"
import { DimensionedNode } from "../primitives/DimensionedNode.js"
import { Calculation, CalculationFunction } from "../primitives/Calculation.js"
import { Identifier } from "../primitives/Identifier.js"


// not clear yet, if Quark should implement WalkableBackwardNode (memory usage concerns)
// incoming edges are used for tree eliminations, but only the size of the set
// also incoming edges are used by references (perhaps not needed)

//---------------------------------------------------------------------------------------------------------------------
export const Quark = <T extends AnyConstructor<DimensionedNode & WalkableBackwardNode & Calculation>>(base : T) =>

Node(class Quark extends base {
    NodeT           : Quark

    identifier      : Identifier

    incoming        : Map<this[ 'NodeT' ], this[ 'LabelT' ]>   = new Map()


    get calculation () : CalculationFunction {
        return this.identifier.calculation
    }


    get calculationContext () : any {
        return this.identifier.calculationContext
    }
})

export type Quark = Mixin<typeof Quark>


export class MinimalQuark extends Quark(Calculation(Box(DimensionedNode(WalkableBackwardNode(WalkableForwardNode(Base)))))) {
    NodeT               : Quark
}

