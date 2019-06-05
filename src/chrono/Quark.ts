import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { DimensionedNode } from "./DimensionedNode.js"
import { Node, WalkableBackwardNode, WalkableForwardNode } from "../graph/Node.js"
import { Box } from "../primitives/Box.js"
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

export interface QuarkI extends Quark {}


export class MinimalQuark extends Quark(Calculation(Box(DimensionedNode(WalkableBackwardNode(WalkableForwardNode(Base)))))) {
    NodeT               : Quark
}


//---------------------------------------------------------------------------------------------------------------------
export class TombstoneQuark extends MinimalQuark {
    NodeT               : TombstoneQuark


    addEdgeTo (toNode : this[ 'NodeT' ], label : this[ 'LabelT' ] = null, calledFromPartner? : boolean) {
        throw new Error("Can not add edges from tombstone node")
    }


    addEdgeFrom (fromNode : this[ 'NodeT' ], label : this[ 'LabelT' ] = null, calledFromPartner? : boolean) {
        throw new Error("Can not add edges to tombstone node")
    }


    get value () {
        throw new Error("Can not read the value from the tombstone quark")
    }


    isCalculationStarted () : boolean {
        return true
    }


    isCalculationCompleted () : boolean {
        return true
    }


    hasValue () : boolean {
        return false
    }
}
