import { AnyConstructor, AnyFunction, Base, Mixin, MixinConstructor } from "../class/Mixin.js"
import { Graph } from "../graph/Graph.js"
import { Node } from "../graph/Node.js"
import { ChronoValue } from "./Atom.js"
import { HasId } from "./HasId.js"


//---------------------------------------------------------------------------------------------------------------------
export const History = <T extends AnyConstructor<Graph>>(base : T) =>

class History extends base {
    nodeT               : Mutation
}

export interface History extends Mixin<typeof History> {}


//---------------------------------------------------------------------------------------------------------------------
export const Mutation = <T extends AnyConstructor<Node>>(base : T) =>

class Mutation extends base {
    protected isOpened    : boolean       = true


    close () {
        this.isOpened       = false
    }


    apply (to : Snapshot) {
        if (this.isOpened) throw new Error("Invalid state")
    }


    unapply (from : Snapshot) {
        if (this.isOpened) throw new Error("Invalid state")
    }


    calculate () {
    }
}

export interface Mutation extends Mixin<typeof Mutation> {}


//---------------------------------------------------------------------------------------------------------------------
export const ChronoQuark = <T extends AnyConstructor<HasId & Node>>(base : T) =>

class ChronoQuark extends base {
    value       : ChronoValue

    graph       : Snapshot


    get () {
        return this.value
    }


    put (proposedValue : ChronoValue, ...args) {
        this.graph.currentContext.sendMessage(this, proposedValue, ...args)
    }
}

export interface ChronoQuark extends Mixin<typeof ChronoQuark> {}


//---------------------------------------------------------------------------------------------------------------------
export const Propagation = <T extends AnyConstructor<Mutation>>(base : T) =>

class Propagation extends base {
    nodeT               : ChronoQuark

    nodesAdded          : Set<this[ 'nodeT' ]>         = new Set()
    nodesRemoved        : Set<this[ 'nodeT' ]>         = new Set()

    nodesChanged        : Map<this[ 'nodeT' ], { old : ChronoValue, new : ChronoValue} > = new Map()

    messages                : Map<ChronoQuark, any[]> = new Map()

    sendMessage (quark : ChronoQuark, ...args) {
        if (!this.isOpened) throw new Error("Invalid state")

        this.messages.set(quark, args)
    }
}

export interface Propagation extends Mixin<typeof Propagation> {}



//---------------------------------------------------------------------------------------------------------------------
export const Snapshot = <T extends AnyConstructor<Graph>>(base : T) =>

class Snapshot extends base {
    nodeT               : ChronoQuark

    currentContext      : Propagation       //= new PropagationContext()

    // the "append-only" graph of mutations
    history         : History

    // copy-on-write source
    basedOn         : Snapshot

    // the "final" representation of this mutation
    attachedTo      : Mutation


    clone () : Snapshot {
        const Self      = this.constructor as SnapshotConstructor

        return Self.new({
            basedOn     : this,
            history     : this.history,
            attachedTo  : this.attachedTo
        })
    }


    addQuark (quark : ChronoQuark) {
        // this.currentContext.addQuark(quark)
    }


    propagate () {
        this.currentContext.calculate()

        this.currentContext.apply(this)
    }


    removeQuark () {

    }

}

type SnapshotConstructor = MixinConstructor<typeof Snapshot>

export interface Snapshot extends Mixin<typeof Snapshot> {}
