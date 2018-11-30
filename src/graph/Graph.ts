import {Constructable, Mixin} from "../class/Mixin.js";
import {Observer} from "./GraphNode.js";


//---------------------------------------------------------------------------------------------------------------------
/*
    A graph which is also a node - this is an Observer, that observes a set of ObservedBy nodes - whole graph

    walking from such Observer will visit the whole graph

    note, that graph itself is not observable by its nodes

*/

export const Graph = <T extends Constructable<Observer>>(base : T) =>

class Graph extends base {

    hasNode (node : this) : boolean {
        return this.fromEdges.has(node)
    }


    addNodes (nodes : this[]) {
        nodes.forEach(node => this.addNode(node))
    }


    addNode (node : this) {
        // <debug>
        if (this.hasNode(node)) throw new Error("The node already exists")
        // </debug>

        this.fromEdges.add(node)
    }


    removeNodes (nodes : this[]) {
        nodes.forEach(node => this.removeNode(node))
    }


    removeNode (node : this) {
        // <debug>
        if (!this.hasNode(node)) throw new Error("The node does not exists")
        // </debug>

        this.fromEdges.delete(node)
    }
}

export type Graph = Mixin<typeof Graph>

