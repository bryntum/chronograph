import { AnyConstructor, ClassUnion, Mixin } from "../class/Mixin.js"
import { WalkContext, WalkStep } from "./WalkDepth.js"

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

    collectNext (sourceNode : WalkableForward, toVisit : WalkStep<WalkableForward>[]) {
        sourceNode.forEachOutgoing(this, (label : Label, outgoingNode : WalkableForward) => toVisit.push({ node : outgoingNode, from : sourceNode, label : label }))
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class WalkBackwardContext<Label = any> extends WalkContext<WalkableBackward> {

    collectNext (sourceNode : WalkableBackward, toVisit : WalkStep<WalkableBackward>[]) {
        sourceNode.forEachIncoming(this, (label : Label, outgoingNode : WalkableBackward) => toVisit.push({ node : outgoingNode, from : sourceNode, label : label }))
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class WalkableForwardNode extends Mixin(
    [],
    (base : AnyConstructor) =>

class WalkableForwardNode extends base implements WalkableForward {
    LabelT          : any
    NodeT           : WalkableForwardNode

    outgoing        : Map<this[ 'NodeT' ], this[ 'LabelT' ]>


    hasEdgeTo (toNode : this[ 'NodeT' ]) : boolean {
        return this.outgoing.has(toNode)
    }


    getLabelTo (toNode : this[ 'NodeT' ]) : this[ 'LabelT' ] {
        return this.outgoing.get(toNode)
    }


    addEdgeTo (toNode : this[ 'NodeT' ], label : this[ 'LabelT' ] = null) {
        this.outgoing.set(toNode, label)
    }


    removeEdgeTo (toNode : this[ 'NodeT' ]) {
        this.outgoing.delete(toNode)
    }


    forEachOutgoing (context : WalkForwardContext, func : (label : this[ 'LabelT' ], node : this[ 'NodeT' ]) => any) {
        this.outgoing.forEach(func)
    }
}){}



//---------------------------------------------------------------------------------------------------------------------
export class WalkableBackwardNode extends Mixin(
    [],
    (base : AnyConstructor) =>

class WalkableBackwardNode extends base implements WalkableBackward {
    LabelT          : any
    NodeT           : WalkableBackwardNode

    incoming        : Map<this[ 'NodeT' ], this[ 'LabelT' ]>


    hasEdgeFrom (fromNode : this[ 'NodeT' ]) : boolean {
        return this.incoming.has(fromNode)
    }


    getLabelFrom (fromNode : this[ 'NodeT' ]) : this[ 'LabelT' ] {
        return this.incoming.get(fromNode)
    }


    addEdgeFrom (fromNode : this[ 'NodeT' ], label : this[ 'LabelT' ] = null) {
        this.incoming.set(fromNode, label)
    }


    removeEdgeFrom (fromNode : this[ 'NodeT' ]) {
        this.incoming.delete(fromNode)
    }


    forEachIncoming (context : WalkBackwardContext, func : (label : this[ 'LabelT' ], node : this[ 'NodeT' ]) => any) {
        this.incoming.forEach(func)
    }
}){}


//---------------------------------------------------------------------------------------------------------------------
export class Node extends Mixin(
    [ WalkableForwardNode, WalkableBackwardNode ],
    (base : ClassUnion<typeof WalkableForwardNode, typeof WalkableBackwardNode>) =>

class Node extends base {
    LabelT          : any
    NodeT           : Node

    incoming        : Map<this[ 'NodeT' ], this[ 'LabelT' ]> = new Map()
    outgoing        : Map<this[ 'NodeT' ], this[ 'LabelT' ]> = new Map()


    addEdgeTo (toNode : this[ 'NodeT' ], label : this[ 'LabelT' ] = null, calledFromPartner? : boolean) {
        super.addEdgeTo(toNode, label)

        if (!calledFromPartner) toNode.addEdgeFrom(this, label, true)
    }

    removeEdgeTo (toNode : this[ 'NodeT' ], calledFromPartner? : boolean) {
        super.removeEdgeTo(toNode)

        if (!calledFromPartner) toNode.removeEdgeFrom(this, true)
    }


    addEdgeFrom (fromNode : this[ 'NodeT' ], label : this[ 'LabelT' ] = null, calledFromPartner? : boolean) {
        super.addEdgeFrom(fromNode, label)

        if (!calledFromPartner) fromNode.addEdgeTo(this, label, true)
    }

    removeEdgeFrom (fromNode : this[ 'NodeT' ], calledFromPartner? : boolean) {
        super.removeEdgeFrom(fromNode)

        if (!calledFromPartner) fromNode.removeEdgeTo(this, true)
    }
}){}
