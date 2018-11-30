import {Base, Constructable, Mixin} from "../class/Mixin.js";
import {GraphNode} from "./GraphNode.js";


export const Graph = <T extends Constructable<GraphNode>>(base : T) =>

class Graph extends base {

    hasNode (node : this) : boolean {
        return this.toEdges.has(node)
    }


    addNodes (nodes : this[]) {
        nodes.forEach(node => this.addNode(node))
    }


    addNode (node : this) {
        // <debug>
        if (this.hasNode(node)) throw new Error("The node already exists")
        // </debug>

        this.toEdges.add(node)
    }


    removeNodes (nodes : this[]) {
        nodes.forEach(node => this.removeNode(node))
    }


    removeNode (node : this) {
        // <debug>
        if (!this.hasNode(node)) throw new Error("The node does not exists")
        // </debug>

        this.toEdges.delete(node)
    }


    // hasEdge(fromNode : GraphNode, toNode : GraphNode) : boolean {
    //     return fromNode.hasEdgeTo(toNode)
    // }
    //
    //
    // addEdge(fromNode : GraphNode, toNode : GraphNode) {
    //     // <debug>
    //     if (fromNode.hasEdgeTo(toNode)) throw new Error("The edge between `from` and `to` nodes already exists")
    //     // </debug>
    //
    //     fromNode.addEdgeTo(toNode)
    // }
    //
    //
    // removeEdge(fromNode : GraphNode, toNode : GraphNode) {
    //     // <debug>
    //     if (!fromNode.hasEdgeTo(toNode)) throw new Error("The edge between `from` and `to` nodes does not exists")
    //     // </debug>
    //
    //     fromNode.removeEdgeTo(toNode)
    // }

}

export type Graph = Mixin<typeof Graph>


export const ChronoGraphLayer = <T extends Constructable<Graph>>(base : T) =>

class ChronoGraphLayer extends base {

    previous            : ChronoGraphLayer

}

export type ChronoGraphLayer = Mixin<typeof ChronoGraphLayer>
