import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { Node, WalkableBackwardNode, WalkableForwardNode, WalkBackwardNodeContext, WalkForwardNodeContext } from "./Node.js"

//---------------------------------------------------------------------------------------------------------------------
export const Graph = <T extends AnyConstructor<WalkableForwardNode & WalkableBackwardNode>>(base : T) =>

class Graph extends base {
    NodeT           : Node

    nodes           : Set<this[ 'NodeT' ]>         = new Set()


    getNodes () : Set<this[ 'NodeT' ]> {
        return this.nodes
    }


    hasNode (node : this[ 'NodeT' ]) : boolean {
        return this.getNodes().has(node)
    }


    addNodes (nodes : this[ 'NodeT' ][]) {
        nodes.forEach(node => this.addNode(node))
    }


    addNode (node : this[ 'NodeT' ]) : this[ 'NodeT' ] {
        this.nodes.add(node)

        return node
    }


    removeNodes (nodes : this[ 'NodeT' ][]) {
        nodes.forEach(node => this.removeNode(node))
    }


    removeNode (node : this[ 'NodeT' ]) {
        // <debug>
        if (!this.hasNode(node)) throw new Error(`This [${node}] does not exists in the graph`)
        // </debug>

        node.outgoing.forEach(toNode => toNode.removeEdgeFrom(node))
        node.incoming.forEach(fromNode => fromNode.removeEdgeTo(node))

        this.nodes.delete(node)
    }


    forEachIncoming (context : WalkBackwardNodeContext, func : (node : this[ 'NodeT' ]) => any) {
        this.nodes.forEach(func)
    }


    forEachOutgoing (context : WalkForwardNodeContext, func : (node : this[ 'NodeT' ]) => any) {
        this.nodes.forEach(func)
    }
}

export type Graph = Mixin<typeof Graph>

export class MinimalGraph extends
    Graph(
    WalkableForwardNode(
    WalkableBackwardNode(
        Base
    ))) {}
