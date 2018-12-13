import {Base, Constructable, Mixin} from "../class/Mixin.js";
import {Walkable, WalkableBackward, WalkableForward, WalkBackwardContext, WalkContext, WalkForwardContext} from "./Walkable.js";

//---------------------------------------------------------------------------------------------------------------------
export const WalkableForwardNode = <T extends Constructable<WalkableForward>>(base : T) =>

class WalkableForwardNode extends base {
    outgoing        : Set<WalkableForwardNode>         = new Set()

    outgoing$       : WalkableForwardNode[]


    initialize () {
        super.initialize(...arguments)

        if (this.outgoing$) {
            this.addEdgesTo(this.outgoing$)

            delete this.outgoing$
        }
    }


    hasEdgeTo (toNode : WalkableForwardNode) : boolean {
        return this.outgoing.has(toNode)
    }


    addEdgeTo (toNode : WalkableForwardNode) {
        this.outgoing.add(toNode)
    }


    addEdgesTo (toNodes : WalkableForwardNode[]) {
        toNodes.forEach(toNode => this.addEdgeTo(toNode))
    }


    getOutgoing (context : WalkContext) : WalkableForwardNode[] {
        return Array.from(this.outgoing)
    }


    forEachOutgoing (context : WalkForwardContext, func : (WalkableForward) => any) {
        this.outgoing.forEach(func)
    }
}

export type WalkableForwardNode = Mixin<typeof WalkableForwardNode>



//---------------------------------------------------------------------------------------------------------------------
export const WalkableBackwardNode = <T extends Constructable<WalkableBackward>>(base : T) =>

class WalkableBackwardNode extends base {
    incomingEdgesStorage    : string    = 'incoming'

    incoming        : Set<WalkableBackwardNode>         = new Set()

    // incoming$       : WalkableBackwardNode[]


    // initialize () {
    //     super.initialize(...arguments)
    //
    //     if (this.incoming$) {
    //         this.addEdgesFrom(this.incoming$)
    //
    //         delete this.incoming$
    //     }
    // }


    hasEdgeFrom (fromNode : WalkableBackwardNode) : boolean {
        return this[ this.incomingEdgesStorage ].has(fromNode)
    }


    addEdgeFrom (fromNode : WalkableBackwardNode) {
        this[ this.incomingEdgesStorage ].add(fromNode)
    }


    addEdgesFrom (fromNodes : WalkableBackwardNode[]) {
        fromNodes.forEach(fromNode => this.addEdgeFrom(fromNode))
    }


    getIncoming (context : WalkContext) : WalkableBackwardNode[] {
        return Array.from(this[ this.incomingEdgesStorage ])
    }

    forEachIncoming(context : WalkBackwardContext, func : (WalkableBackward) => any) {
        this[ this.incomingEdgesStorage ].forEach(func)
    }
}

export type WalkableBackwardNode = Mixin<typeof WalkableBackwardNode>



//---------------------------------------------------------------------------------------------------------------------
export const Node = <T extends Constructable<WalkableForwardNode & WalkableBackwardNode>>(base : T) =>

class Node extends base {

    addEdgeTo (toNode : Node) {
        super.addEdgeTo(toNode)

        toNode.incoming.add(this)
    }

    addEdgeFrom (fromNode : Node) {
        super.addEdgeFrom(fromNode)

        fromNode.outgoing.add(this)
    }
}

export type Node = Mixin<typeof Node>


export const MinimalNode    = Node(WalkableForwardNode(WalkableBackwardNode(WalkableForward(WalkableBackward(Walkable(Base))))))
export type MinimalNode     = InstanceType<typeof MinimalNode>
