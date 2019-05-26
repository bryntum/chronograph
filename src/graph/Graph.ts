import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { Node, WalkableBackward, WalkableForward, WalkBackwardContext, WalkForwardContext } from "./Node.js"

//---------------------------------------------------------------------------------------------------------------------
export const Graph = <T extends AnyConstructor<object>>(base : T) =>

class Graph extends base implements WalkableForward, WalkableBackward {
    LabelT          : any
    NodeT           : Node

    nodes           : Map<this[ 'NodeT' ], this[ 'LabelT' ]>         = new Map()


    hasNode (node : this[ 'NodeT' ]) : boolean {
        return this.nodes.has(node)
    }


    addNode (node : this[ 'NodeT' ], label : this[ 'LabelT' ] = null) {
        this.nodes.set(node, label)
    }


    removeNode (node : this[ 'NodeT' ]) {
        this.nodes.delete(node)
    }


    forEachIncoming (context : WalkBackwardContext, func : (label : this[ 'LabelT' ], node : this[ 'NodeT' ]) => any) {
        this.nodes.forEach(func)
    }


    forEachOutgoing (context : WalkForwardContext, func : (label : this[ 'LabelT' ], node : this[ 'NodeT' ]) => any) {
        this.nodes.forEach(func)
    }
}

export type Graph = Mixin<typeof Graph>

export class MinimalGraph extends Graph(Base) {
    NodeT           : Node
}


