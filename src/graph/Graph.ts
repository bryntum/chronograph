import {Constructable, Mixin} from "../class/Mixin.js";
import {Node} from "./Node.js";
import {WalkableBackward, WalkableForward} from "./Walkable.js";

//---------------------------------------------------------------------------------------------------------------------
export const Graph = <T extends Constructable<WalkableForward & WalkableBackward>>(base : T) =>

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

        this.nodes.delete(node)
    }


    getIncoming () : this[ 'nodeT' ][] {
        return Array.from(this.nodes)
    }


    getOutgoing () : this[ 'nodeT' ][] {
        return Array.from(this.nodes)
    }
}

export type Graph = Mixin<typeof Graph>
