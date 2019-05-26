import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { WalkContext } from "./Walkable.js"

//---------------------------------------------------------------------------------------------------------------------
export interface WalkableForward<Label = any> {
    forEachOutgoing (context : WalkForwardContext<Label>, func : (label : Label, node : WalkableForward) => any)
}

//---------------------------------------------------------------------------------------------------------------------
export interface WalkableBackward<Label = any> {
    forEachIncoming (context : WalkBackwardContext<Label>, func : (label : Label, node : WalkableBackward) => any)
}


//---------------------------------------------------------------------------------------------------------------------
export class WalkForwardContext<Label = any> extends WalkContext<WalkableForward, Label> {

    forEachNext (node : WalkableForward, func : (label : Label, node : WalkableForward) => any) {
        node.forEachOutgoing(this, func)
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class WalkBackwardContext<Label = any> extends WalkContext<WalkableBackward> {

    forEachNext (node : WalkableBackward, func : (label, node : WalkableBackward) => any) {
        node.forEachIncoming(this, func)
    }
}


//---------------------------------------------------------------------------------------------------------------------
export const WalkableForwardNode = <T extends AnyConstructor<object>>(base : T) =>

class WalkableForwardNode extends base implements WalkableForward {
    LabelT          : any

    outgoing        : Map<WalkableForwardNode, this[ 'LabelT' ]>


    hasEdgeTo (toNode : WalkableForwardNode) : boolean {
        return this.outgoing.has(toNode)
    }


    getLabelTo (toNode : WalkableForwardNode) : this[ 'LabelT' ] {
        return this.outgoing.get(toNode)
    }


    addEdgeTo (toNode : WalkableForwardNode, label : this[ 'LabelT' ] = null) {
        this.outgoing.set(toNode, label)
    }


    removeEdgeTo (toNode : WalkableForwardNode) {
        this.outgoing.delete(toNode)
    }


    forEachOutgoing (context : WalkForwardContext, func : (label : this[ 'LabelT' ], node : WalkableForwardNode) => any) {
        this.outgoing.forEach(func)
    }
}

export type WalkableForwardNode = Mixin<typeof WalkableForwardNode>


//---------------------------------------------------------------------------------------------------------------------
export const WalkableBackwardNode = <T extends AnyConstructor<object>>(base : T) =>

class WalkableBackwardNode extends base implements WalkableBackward {
    LabelT          : any

    incoming        : Map<WalkableBackwardNode, this[ 'LabelT' ]>


    hasEdgeFrom (fromNode : WalkableBackwardNode) : boolean {
        return this.incoming.has(fromNode)
    }


    getLabelFrom (fromNode : WalkableBackwardNode) : this[ 'LabelT' ] {
        return this.incoming.get(fromNode)
    }


    addEdgeFrom (fromNode : WalkableBackwardNode, label : this[ 'LabelT' ] = null) {
        this.incoming.set(fromNode, label)
    }


    removeEdgeFrom (fromNode : WalkableBackwardNode) {
        this.incoming.delete(fromNode)
    }


    forEachIncoming (context : WalkBackwardContext, func : (label : this[ 'LabelT' ], node : WalkableBackwardNode) => any) {
        this.incoming.forEach(func)
    }
}

export type WalkableBackwardNode = Mixin<typeof WalkableBackwardNode>



//---------------------------------------------------------------------------------------------------------------------
export const Node = <T extends AnyConstructor<WalkableForwardNode & WalkableBackwardNode>>(base : T) =>

class Node extends base {
    LabelT          : any
    NodeT           : Node

    outgoing        : Map<this[ 'NodeT' ], this[ 'LabelT' ]>   = new Map()
    incoming        : Map<this[ 'NodeT' ], this[ 'LabelT' ]>   = new Map()


    addEdgeTo (toNode : this[ 'NodeT' ], label : this[ 'LabelT' ] = null) {
        super.addEdgeTo(toNode, label)

        toNode.incoming.set(this, label)
    }

    removeEdgeTo (toNode : this[ 'NodeT' ]) {
        super.removeEdgeTo(toNode)

        toNode.incoming.delete(this)
    }


    addEdgeFrom (fromNode : this[ 'NodeT' ], label : this[ 'LabelT' ] = null) {
        super.addEdgeFrom(fromNode, label)

        fromNode.outgoing.set(this, label)
    }

    removeEdgeFrom (fromNode : this[ 'NodeT' ]) {
        super.removeEdgeFrom(fromNode)

        fromNode.outgoing.delete(this)
    }
}

export type Node = Mixin<typeof Node>

export class MinimalNode extends
    Node(
    WalkableForwardNode(
    WalkableBackwardNode(
        Base
    )))
{
    LabelT          : any
    NodeT           : Node
}
