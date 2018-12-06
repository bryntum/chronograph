import {Atom, ChronoValue, Readable, Writable} from "../chrono/Atom.js";
import {ImmutableConstructor, MinimalImmutable} from "../chrono/Immutable.js";
import {MutableBox} from "../chrono/MutableBox.js";
import {ObservableRead, ObservableWrite} from "../chrono/Observation.js";
import {Reference} from "../chrono/Reference.js";
import {Base, Constructable, Mixin} from "../class/Mixin.js";
import {HasId} from "./HasId.js";
import {ChronoGraphNode, ChronoGraphNodeConstructor, MinimalChronoGraphNode} from "./Node.js";


export const Box = <T extends Constructable<MutableBox & HasId & ObservableRead & ObservableWrite>>(base: T) =>

class Box extends base {
    cls             : ChronoGraphNodeConstructor  = MinimalChronoGraphNode

    value           : ChronoGraphNode

    graph           : ObservableRead & ObservableWrite


    observeRead (value : ChronoValue) {
        this.graph && this.graph.observeRead(this)
    }


    observeWrite (value : ChronoValue) {
        this.graph && this.graph.observeWrite(this)
    }


    toString () {
        return `[box ${ this.id }]`
    }
}

export type Box = Mixin<typeof Box>


export const MinimalBox     = Box(HasId(MutableBox(ObservableRead(ObservableWrite(Reference(Writable(Readable(Atom(Base)))))))))
export type MinimalBox      = InstanceType<typeof MinimalBox>
