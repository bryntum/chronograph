import { Mixin } from "../class/BetterMixin.js";
import { WalkContext } from "./WalkDepth.js";
//---------------------------------------------------------------------------------------------------------------------
export class WalkForwardContext extends WalkContext {
    collectNext(sourceNode, toVisit) {
        sourceNode.forEachOutgoing(this, (label, outgoingNode) => toVisit.push({ node: outgoingNode, from: sourceNode, label: label }));
    }
}
//---------------------------------------------------------------------------------------------------------------------
export class WalkBackwardContext extends WalkContext {
    collectNext(sourceNode, toVisit) {
        sourceNode.forEachIncoming(this, (label, outgoingNode) => toVisit.push({ node: outgoingNode, from: sourceNode, label: label }));
    }
}
//---------------------------------------------------------------------------------------------------------------------
export class WalkableForwardNode extends Mixin([], (base) => class WalkableForwardNode extends base {
    hasEdgeTo(toNode) {
        return this.outgoing.has(toNode);
    }
    getLabelTo(toNode) {
        return this.outgoing.get(toNode);
    }
    addEdgeTo(toNode, label = null) {
        this.outgoing.set(toNode, label);
    }
    removeEdgeTo(toNode) {
        this.outgoing.delete(toNode);
    }
    forEachOutgoing(context, func) {
        this.outgoing.forEach(func);
    }
}) {
}
//---------------------------------------------------------------------------------------------------------------------
export class WalkableBackwardNode extends Mixin([], (base) => class WalkableBackwardNode extends base {
    hasEdgeFrom(fromNode) {
        return this.incoming.has(fromNode);
    }
    getLabelFrom(fromNode) {
        return this.incoming.get(fromNode);
    }
    addEdgeFrom(fromNode, label = null) {
        this.incoming.set(fromNode, label);
    }
    removeEdgeFrom(fromNode) {
        this.incoming.delete(fromNode);
    }
    forEachIncoming(context, func) {
        this.incoming.forEach(func);
    }
}) {
}
//---------------------------------------------------------------------------------------------------------------------
export class Node extends Mixin([WalkableForwardNode, WalkableBackwardNode], (base) => class Node extends base {
    constructor() {
        super(...arguments);
        this.incoming = new Map();
        this.outgoing = new Map();
    }
    addEdgeTo(toNode, label = null, calledFromPartner) {
        super.addEdgeTo(toNode, label);
        if (!calledFromPartner)
            toNode.addEdgeFrom(this, label, true);
    }
    removeEdgeTo(toNode, calledFromPartner) {
        super.removeEdgeTo(toNode);
        if (!calledFromPartner)
            toNode.removeEdgeFrom(this, true);
    }
    addEdgeFrom(fromNode, label = null, calledFromPartner) {
        super.addEdgeFrom(fromNode, label);
        if (!calledFromPartner)
            fromNode.addEdgeTo(this, label, true);
    }
    removeEdgeFrom(fromNode, calledFromPartner) {
        super.removeEdgeFrom(fromNode);
        if (!calledFromPartner)
            fromNode.removeEdgeTo(this, true);
    }
}) {
}
