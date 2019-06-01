import { AnyConstructor, Mixin } from "../class/Mixin.js"
import { WalkableForwardNode, WalkForwardContext } from "./Node.js"
import { WalkContext } from "./Walkable.js"


//---------------------------------------------------------------------------------------------------------------------
export class WalkForwardDimensionedNodeContext<Label = any> extends WalkContext<DimensionedNode, Label> {

    walkDimension       : Label

    forEachNext (node : DimensionedNode, func : (label : any, node : DimensionedNode) => any) {
        const dimension     = node.outgoingByLabel.get(this.walkDimension)

        dimension && dimension.forEach(func)
    }
}



//---------------------------------------------------------------------------------------------------------------------
export const DimensionedNode = <T extends AnyConstructor<object>>(base : T) =>

class DimensionedNode extends base implements WalkableForwardNode {
    LabelT          : any
    NodeT           : DimensionedNode

    outgoingByLabel         : Map<this[ 'LabelT' ], Set<this[ 'NodeT' ]>>    = new Map()


    hasEdgeTo (toNode : this[ 'NodeT' ]) : boolean {
        throw new Error("Not implemented")
    }


    getLabelTo (toNode : this[ 'NodeT' ]) : this[ 'LabelT' ] {
        throw new Error("Not implemented")
    }


    removeEdgeTo (toNode : this[ 'NodeT' ]) {
        throw new Error("Not implemented")
    }


    forEachOutgoing (context : WalkForwardContext, func : (label : this[ 'LabelT' ], node : this[ 'NodeT' ]) => any) {
        for (const [ node, label ] of this.iterateAllOutgoing()) func(label, node)
    }


    forEachOutgoingInDimension (dimension : this[ 'LabelT' ], func : (label : this[ 'LabelT' ], node : this[ 'NodeT' ]) => any) {
        const outgoingOfDimension   = this.outgoingByLabel.get(dimension)

        outgoingOfDimension && outgoingOfDimension.forEach(func)
    }


    addEdgeTo (toNode : this[ 'NodeT' ], label : this[ 'LabelT' ] = null) {
        let dimension           = this.outgoingByLabel.get(label)

        if (!dimension) {
            dimension           = new Set()
            this.outgoingByLabel.set(label, dimension)
        }

        dimension.add(toNode)
    }


    * iterateAllOutgoing () : IterableIterator<[ this[ 'LabelT' ], Set<this[ 'NodeT' ]> ]> {
        for (const [ dimension, outgoingNodes ] of this.outgoingByLabel) {
            for (const outgoingNode of outgoingNodes) {
                yield [ outgoingNode, dimension ]
            }
        }
    }
}

export type DimensionedNode = Mixin<typeof DimensionedNode>
