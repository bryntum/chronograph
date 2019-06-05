import { AnyConstructor, Mixin } from "../class/Mixin.js"
import { WalkForwardContext } from "../graph/Node.js"
import { WalkContext } from "../graph/Walkable.js"
import { Identifier } from "../primitives/Identifier.js"
import { Quark, QuarkI } from "./Quark.js"


//---------------------------------------------------------------------------------------------------------------------
export class WalkForwardDimensionedNodeContext<Label = any> extends WalkContext<DimensionedNode, Label> {
    latest              : Map<Identifier, Quark>

    walkDimension       : Set<Label>     = new Set()

    forEachNext (node : DimensionedNode, func : (label : Label, node : DimensionedNode) => any) {
        node.forEachOutgoingInDimension(this.latest, this.walkDimension, func)
    }
}



//---------------------------------------------------------------------------------------------------------------------
export const DimensionedNode = <T extends AnyConstructor<object>>(base : T) =>

class DimensionedNode extends base {
    LabelT                  : any
    NodeT                   : DimensionedNode

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
        throw new Error("Not implemented")
    }


    forEachOutgoingInDimension (latest : Map<Identifier, QuarkI>, dimensions : Set<this[ 'LabelT' ]>, func : (label : this[ 'LabelT' ], node : this[ 'NodeT' ]) => any) {
        for (const dimension of dimensions) {
            const outgoingOfDimension   = this.outgoingByLabel.get(dimension)

            if (outgoingOfDimension)
                for (const outgoingNode of outgoingOfDimension)
                    if (outgoingNode === latest.get(outgoingNode.identifier)) func(undefined, outgoingNode)
        }
    }


    addEdgeTo (toNode : this[ 'NodeT' ], label : this[ 'LabelT' ] = null) {
        let dimension           = this.outgoingByLabel.get(label)

        if (!dimension) {
            dimension           = new Set()
            this.outgoingByLabel.set(label, dimension)
        }

        dimension.add(toNode)
    }
}

export type DimensionedNode = Mixin<typeof DimensionedNode>
