import { Base, Mixin } from "../class/BetterMixin.js";
//---------------------------------------------------------------------------------------------------------------------
export class Graph extends Mixin([], (base) => class Graph extends base {
    constructor() {
        super(...arguments);
        this.nodes = new Map();
    }
    hasNode(node) {
        return this.nodes.has(node);
    }
    addNode(node, label = null) {
        this.nodes.set(node, label);
    }
    removeNode(node) {
        this.nodes.delete(node);
    }
    forEachIncoming(context, func) {
        this.nodes.forEach(func);
    }
    forEachOutgoing(context, func) {
        this.nodes.forEach(func);
    }
}) {
}
export class GraphBase extends Graph.derive(Base) {
}
// export class GraphBase2 extends Mixin([ Graph, Base ], IdentityMixin<Graph & Base>()) {}
//
//
// const a = GraphBase2.new()
//
// a.
//
// a.zxc
