import {Constructable, Mixin} from "../class/Mixin.js";
import {Node} from "./Node.js";
import {WalkableBackward, WalkableForward} from "./Walkable.js";


//---------------------------------------------------------------------------------------------------------------------
export const Graph = <T extends Constructable<WalkableForward & WalkableBackward>>(base : T) =>

class Graph extends base {

    nodes           : Set<Node>         = new Set()


    getNodes () : Set<Node> {
        return this.nodes
    }


    hasDirectNode (node : Node) : boolean {
        return this.getNodes().has(node)
    }


    addNodes (nodes : Node[]) {
        nodes.forEach(node => this.addNode(node))
    }


    addNode (node : Node) : Node {
        // <debug>
        if (this.hasDirectNode(node)) throw new Error(`This [${node}] already exists in the graph`)
        // </debug>

        this.nodes.add(node)

        return node
    }


    removeNodes (nodes : Node[]) {
        nodes.forEach(node => this.removeNode(node))
    }


    removeNode (node : Node) {
        // <debug>
        if (!this.hasDirectNode(node)) throw new Error(`This [${node}] does not exists in the graph`)
        // </debug>

        this.nodes.delete(node)
    }


    getIncoming () : Node[] {
        return Array.from(this.nodes)
    }


    getOutgoing() : Node[] {
        return Array.from(this.nodes)
    }
}

export type Graph = Mixin<typeof Graph>
