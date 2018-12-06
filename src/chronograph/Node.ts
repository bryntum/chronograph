import {Atom, ChronoValue, Readable, Writable} from "../chrono/Atom.js";
import {Immutable} from "../chrono/Immutable.js";
import {Constructable, Mixin, MixinConstructor} from "../class/Mixin.js";
import {MinimalNode, Node} from "../graph/Node.js";
import {HasId} from "./HasId.js";


export const ChronoGraphNode = <T extends Constructable<Node & Immutable & HasId>>(base: T) =>

class ChronoGraphNode extends base {

    nextConfig (value : ChronoValue) : Partial<this> {
        return Object.assign(super.nextConfig(value), { id : this.id })
    }


    toString () {
        return `[node ${ this.id }]`
    }


    // ???
    onJoinGraph () {
    }
}

export type ChronoGraphNode             = Mixin<typeof ChronoGraphNode>
export type ChronoGraphNodeConstructor  = MixinConstructor<typeof ChronoGraphNode>


export const MinimalChronoGraphNode     = ChronoGraphNode(HasId(Immutable(Writable(Readable(Atom(MinimalNode))))))
export type MinimalChronoGraphNode      = InstanceType<typeof MinimalChronoGraphNode>
