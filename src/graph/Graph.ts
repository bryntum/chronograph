import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { Node, WalkableBackwardNode, WalkableForwardNode } from "./Node.js"
import { Walkable, WalkableBackward, WalkableForward, WalkBackwardContext, WalkForwardContext } from "./Walkable.js"

//---------------------------------------------------------------------------------------------------------------------
export const Graph = <T extends AnyConstructor<WalkableForward & WalkableBackward>>(base : T) =>

class Graph extends base {
    nodeT           : Node

    nodes           : Set<this[ 'nodeT' ]>         = new Set()


    getNodes () : Set<this[ 'nodeT' ]> {
        return this.nodes
    }


    hasDirectNode (node : this[ 'nodeT' ]) : boolean {
        return this.getNodes().has(node)
    }


    addNodes (nodes : this[ 'nodeT' ][]) {
        nodes.forEach(node => this.addNode(node))
    }


    addNode (node : this[ 'nodeT' ]) : this[ 'nodeT' ] {
        this.nodes.add(node)

        return node
    }


    removeNodes (nodes : this[ 'nodeT' ][]) {
        nodes.forEach(node => this.removeNode(node))
    }


    removeNode (node : this[ 'nodeT' ]) {
        // <debug>
        if (!this.hasDirectNode(node)) throw new Error(`This [${node}] does not exists in the graph`)
        // </debug>

        node.outgoing.forEach(toNode => toNode.removeEdgeFrom(node))
        node.incoming.forEach(fromNode => fromNode.removeEdgeTo(node))

        this.nodes.delete(node)
    }


    getIncoming () : this[ 'nodeT' ][] {
        return Array.from(this.nodes)
    }


    getOutgoing () : this[ 'nodeT' ][] {
        return Array.from(this.nodes)
    }


    forEachIncoming (context : WalkBackwardContext, func : (node : this[ 'nodeT' ]) => any) {
        this.nodes.forEach(func)
    }


    forEachOutgoing (context : WalkForwardContext, func : (node : this[ 'nodeT' ]) => any) {
        this.nodes.forEach(func)
    }
}

export type Graph = Mixin<typeof Graph>

export class MinimalGraph extends
    Graph(
    WalkableForwardNode(
    WalkableBackwardNode(
    WalkableForward(
    WalkableBackward(
    Walkable(
        Base
    )))))) {}
