import { Atom, Readable, Writable } from "../chrono/Atom.js";
import { MutableBox } from "../chrono/MutableBox.js";
import { ObservableRead, ObservableWrite } from "../chrono/Observation.js";
import { Reference } from "../chrono/Reference.js";
import { Base } from "../class/Mixin.js";
import { Node, WalkableBackwardNode, WalkableForwardNode } from "../graph/Node.js";
import { Walkable, WalkableBackward, WalkableForward } from "../graph/Walkable.js";
import { HasId } from "./HasId.js";
import { MinimalChronoGraphNode } from "./Node.js";
export const Box = (base) => class Box extends base {
    constructor() {
        super(...arguments);
        this.cls = MinimalChronoGraphNode;
        // TODO figure out the proper typing
        this.toBehavior = new Set();
    }
    initialAtomConfig(value) {
        return Object.assign(super.initialAtomConfig(value), { id: this.id });
    }
    observeRead(value) {
        this.graph && this.graph.observeRead(this);
    }
    observeWrite(value, box) {
        this.graph && this.graph.observeWrite(value, box);
    }
    joinGraph(graph) {
        if (this.graph)
            this.unjoinGraph();
        this.graph = graph;
        graph.addNode(this);
    }
    unjoinGraph() {
        this.graph = null;
    }
    toString() {
        return `[box ${this.id}]`;
    }
};
export const MinimalBox = Box(Node(WalkableForwardNode(WalkableBackwardNode(WalkableForward(WalkableBackward(Walkable(HasId(ObservableRead(ObservableWrite(MutableBox(Reference(Writable(Readable(Atom(Base)))))))))))))));
// export const MinimalDelegatedBox    = Box(
//     Node(WalkableForwardNode(WalkableBackwardNode(WalkableForward(WalkableBackward(Walkable(
//         HasId(ObservableRead(ObservableWrite(MutableBox(Reference(DelegatedStorage(Writable(Readable(Atom(Base)))))))))
//     ))))))
// )
// export type MinimalDelegatedBox     = InstanceType<typeof MinimalDelegatedBox>
//
//
