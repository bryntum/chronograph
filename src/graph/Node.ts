import {AnyConstructor, Base, Mixin} from "../class/Mixin.js";
import {Walkable, WalkableBackward, WalkableForward, WalkBackwardContext, WalkContext, WalkForwardContext} from "./Walkable.js";

//---------------------------------------------------------------------------------------------------------------------
export const WalkableForwardNode = <T extends AnyConstructor<WalkableForward>>(base : T) =>

class WalkableForwardNode extends base {
    outgoing        : Set<WalkableForwardNode>         = new Set()


    hasEdgeTo (toNode : WalkableForwardNode) : boolean {
        return this.outgoing.has(toNode)
    }


    addEdgeTo (toNode : WalkableForwardNode) {
        this.outgoing.add(toNode)
    }


    removeEdgeTo (toNode : WalkableForwardNode) {
        this.outgoing.delete(toNode)
    }


    addEdgesTo (toNodes : WalkableForwardNode[]) {
        toNodes.forEach(toNode => this.addEdgeTo(toNode))
    }


    getOutgoing (context : WalkContext) : WalkableForwardNode[] {
        return Array.from(this.outgoing)
    }


    forEachOutgoing (context : WalkForwardContext, func : (node : WalkableForward) => any) {
        this.outgoing.forEach(func)
    }
}

export type WalkableForwardNode = Mixin<typeof WalkableForwardNode>



//---------------------------------------------------------------------------------------------------------------------
export const WalkableBackwardNode = <T extends AnyConstructor<WalkableBackward>>(base : T) =>

class WalkableBackwardNode extends base {
    incoming        : Set<WalkableBackwardNode>         = new Set()


    hasEdgeFrom (fromNode : WalkableBackwardNode) : boolean {
        return this.incoming.has(fromNode)
    }


    addEdgeFrom (fromNode : WalkableBackwardNode) {
        this.incoming.add(fromNode)
    }


    removeEdgeFrom (fromNode : WalkableBackwardNode) {
        this.incoming.delete(fromNode)
    }


    addEdgesFrom (fromNodes : WalkableBackwardNode[]) {
        fromNodes.forEach(fromNode => this.addEdgeFrom(fromNode))
    }


    getIncoming (context : WalkContext) : WalkableBackwardNode[] {
        return Array.from(this.incoming)
    }

    forEachIncoming(context : WalkBackwardContext, func : (node : WalkableBackward) => any) {
        this.incoming.forEach(func)
    }
}

export type WalkableBackwardNode = Mixin<typeof WalkableBackwardNode>



//---------------------------------------------------------------------------------------------------------------------
export const Node = <T extends AnyConstructor<WalkableForwardNode & WalkableBackwardNode>>(base : T) =>

class Node extends base {

    addEdgeTo (toNode : Node) {
        super.addEdgeTo(toNode)

        toNode.incoming.add(this)
    }

    removeEdgeTo (toNode : Node) {
        super.removeEdgeTo(toNode)

        toNode.incoming.delete(this)
    }


    addEdgeFrom (fromNode : Node) {
        super.addEdgeFrom(fromNode)

        fromNode.outgoing.add(this)
    }

    removeEdgeFrom (fromNode : Node) {
        super.removeEdgeFrom(fromNode)

        fromNode.outgoing.delete(this)
    }

}

export type Node = Mixin<typeof Node>


export const MinimalNode    = Node(WalkableForwardNode(WalkableBackwardNode(WalkableForward(WalkableBackward(Walkable(Base))))))
export type MinimalNode     = InstanceType<typeof MinimalNode>
