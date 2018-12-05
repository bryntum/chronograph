import {Constructable, Mixin} from "../class/Mixin.js";
import {WalkableBackward, WalkableForward} from "./Walkable.js";

//---------------------------------------------------------------------------------------------------------------------
export const WalkableForwardNode = <T extends Constructable<WalkableForward>>(base : T) =>

class WalkableForwardNode extends base {
    outgoing        : Set<this>         = new Set()


    hasEdgeTo (toNode : this) : boolean {
        return this.outgoing.has(toNode)
    }


    addEdgeTo (toNode : this) {
        this.outgoing.add(toNode)
    }


    addEdgesTo (toNodes : this[]) {
        toNodes.forEach(toNode => this.addEdgeTo(toNode))
    }


    getOutgoing () : this[] {
        return Array.from(this.outgoing)
    }
}

export type WalkableForwardNode = Mixin<typeof WalkableForwardNode>



//---------------------------------------------------------------------------------------------------------------------
export const WalkableBackwardNode = <T extends Constructable<WalkableBackward>>(base : T) =>

class WalkableBackwardNode extends base {
    incoming        : Set<this>         = new Set()


    hasEdgeFrom (fromNode : this) : boolean {
        return this.incoming.has(fromNode)
    }


    addEdgeFrom (fromNode : this) {
        this.incoming.add(fromNode)
    }


    addEdgesFrom (fromNodes : this[]) {
        fromNodes.forEach(fromNode => this.addEdgeFrom(fromNode))
    }


    getIncoming () : this[] {
        return Array.from(this.incoming)
    }
}

export type WalkableBackwardNode = Mixin<typeof WalkableBackwardNode>



//---------------------------------------------------------------------------------------------------------------------
export const Node = <T extends Constructable<WalkableForwardNode & WalkableBackwardNode>>(base : T) =>

class Node extends base {
}

export type Node = Mixin<typeof Node>


