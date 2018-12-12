import {Atom, ChronoValue, Readable, Writable} from "../chrono/Atom.js";
import {MutableBox} from "../chrono/MutableBox.js";
import {ObservableRead, ObservableWrite} from "../chrono/Observation.js";
import {Reference} from "../chrono/Reference.js";
import {Base, Constructable, Mixin} from "../class/Mixin.js";
import {Node, WalkableBackwardNode, WalkableForwardNode} from "../graph/Node.js";
import {Walkable, WalkableBackward, WalkableForward} from "../graph/Walkable.js";
import {HasId} from "./HasId.js";
import {ChronoGraphNode, ChronoGraphNodeConstructor, MinimalChronoGraphNode} from "./Node.js";


export const Box = <T extends Constructable<Node & MutableBox & HasId & ObservableRead & ObservableWrite>>(base: T) =>

class Box extends base {
    cls             : ChronoGraphNodeConstructor  = MinimalChronoGraphNode

    value           : ChronoGraphNode

    graph           : ObservableRead & ObservableWrite


    initialAtomConfig (value : ChronoValue) : Partial<ChronoGraphNode> {
        return Object.assign(super.initialAtomConfig(value), { id : this.id })
    }


    observeRead (value : ChronoValue) {
        this.graph && this.graph.observeRead(this)
    }


    observeWrite (value : ChronoValue, box : Box) {
        this.graph && this.graph.observeWrite(value, box)
    }


    toString () {
        return `[box ${ this.id }]`
    }
}

export type Box = Mixin<typeof Box>


export const MinimalBox     = Box(
    Node(WalkableForwardNode(WalkableBackwardNode(WalkableForward(WalkableBackward(Walkable(
        HasId(ObservableRead(ObservableWrite(MutableBox(Reference(Writable(Readable(Atom(Base))))))))
    ))))))
)
export type MinimalBox      = InstanceType<typeof MinimalBox>
