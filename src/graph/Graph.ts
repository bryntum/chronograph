import { Base } from "../class/Base.js"
import { AnyConstructor, Mixin } from "../class/Mixin.js"
import { Node, WalkableBackward, WalkableForward, WalkBackwardContext, WalkForwardContext } from "./Node.js"

//---------------------------------------------------------------------------------------------------------------------
export class Graph extends Mixin(
    [],
    (base : AnyConstructor) =>

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
}){}

export class GraphBase extends Graph.derive(Base) {}


// export class GraphBase2 extends Mixin([ Graph, Base ], IdentityMixin<Graph & Base>()) {}
//
//
// const a = GraphBase2.new()
//
// a.
//
// a.zxc
