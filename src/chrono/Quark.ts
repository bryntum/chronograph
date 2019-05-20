import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { Graph } from "../graph/Graph.js"
import { MinimalNode, Node } from "../graph/Node.js"
import { Walkable } from "../graph/Walkable.js"
import { Box } from "./Box.js"
import { ChronoCalculation, ChronoCalculationFunc, ChronoValue } from "./Calculation.js"
import { HasId } from "./HasId.js"


// //---------------------------------------------------------------------------------------------------------------------
// export const Observable = <T extends AnyConstructor<Base>>(base : T) => {
//
//     abstract class Observable extends base {
//         abstract observe (calculation : Calculation) : Quark
//     }
//
//     return Observable
// }
//
// export type Observable = Mixin<typeof Observable>
//
// const observe = (calculation : Calculation) : Quark => {
//     return MinimalQuark.new({ calculation })
// }


// //---------------------------------------------------------------------------------------------------------------------
// export const Input = <T extends AnyConstructor<Box & Observable & WalkableForwardNode>>(base : T) =>
//
// class Input extends base {
//
//     put (value : ChronoValue) {
//         this.value = value
//     }
//
//
//     observe (calculation : Calculation) : Quark {
//         return MinimalQuark.new({ value : this.value })
//     }
// }
//
// export interface Input extends Mixin<typeof Input> {}


export const isQuark = (value : any) : value is Quark => false
export const isAtom = (value : any) : value is Atom => false

export type Revision        = number
// export type ChronoIterationResult = { value? : ChronoValue, requested? : Quark, effect? : Effect }

//---------------------------------------------------------------------------------------------------------------------
export const Quark = <T extends AnyConstructor<Node & ChronoCalculation>>(base : T) =>

class Quark extends base {
    revision            : Revision

    // previous            : QuarkI

    atom                : Atom
}

export type Quark = Mixin<typeof Quark>
export interface QuarkI extends Mixin<typeof Quark> {}

export class MinimalQuark extends Quark(ChronoCalculation(Box(MinimalNode))) {}


// //---------------------------------------------------------------------------------------------------------------------
// export const ChronoGraph = <T extends AnyConstructor<Graph>>(base : T) =>
//
// class ChronoGraph extends base {
//     nodeT               : Quark
// }
//
// export interface ChronoGraph extends Mixin<typeof ChronoGraph> {}




//---------------------------------------------------------------------------------------------------------------------
export const Atom = <T extends AnyConstructor<Node & HasId & Box>>(base : T) =>

class Atom extends base {
    snapshot                : Snapshot

    // // the top-most quark contains the "current" value
    // quarks          : Quark[]           = []

    quarks                  : Map<Revision, Quark>      = new Map()

    cachedCurrentQuark      : Quark
    cachedCurrentRevision   : Revision


    getCurrentQuark () : Quark {
        if (this.snapshot.revision === this.cachedCurrentRevision) return this.cachedCurrentQuark

        this.cachedCurrentRevision = this.snapshot.revision

        return this.cachedCurrentQuark = this.quarks.get(this.cachedCurrentRevision)
    }


    get value () : this[ 'valueT' ] {
        return this.getCurrentQuark().value
    }


    get incoming () : Set<Node> {
        return this.getCurrentQuark().incoming
    }


    get outgoing () : Set<Node> {
        return this.getCurrentQuark().outgoing
    }
}

export interface Atom extends Mixin<typeof Atom> {}


//---------------------------------------------------------------------------------------------------------------------
export const UserInputAtom = <T extends AnyConstructor<Atom>>(base : T) =>

class UserInputAtom extends base {

    put (value : ChronoValue) {
        const activeTransaction     = this.snapshot.activeTransaction

        // every new quark gets a new revision - thus the batch is ordered
        const inputQuark        = MinimalQuark.new({ value : value, atom : this/*, revision : this.snapshot.nextRevision()*/ })

        activeTransaction.addNewQuark(inputQuark)
    }
}

export interface UserInputAtom extends Mixin<typeof UserInputAtom> {}



// aka Replica
//---------------------------------------------------------------------------------------------------------------------
export const Snapshot = <T extends AnyConstructor<Graph & Walkable>>(base : T) =>

class Snapshot extends base {
    revision            : Revision

    activeTransaction   : Transaction // = new MinimalTransaction


    observe (calculation : ChronoCalculationFunc) : Atom {
        return //MinimalQuark.new({ calculation })
    }


    propagate () {
        this.activeTransaction.propagate()
    }


    apply (transaction : Transaction) {

    }


    unapply (transaction : Transaction) {

    }
}

export interface Snapshot extends Mixin<typeof Snapshot> {}



//---------------------------------------------------------------------------------------------------------------------
export const Transaction = <T extends AnyConstructor<ChronoCalculation & Walkable>>(base : T) =>

class Transaction extends base {
    protected isOpened      : boolean       = true
    // protected isStarted     : boolean       = false

    revision                : Revision

    toCalculate             : QuarkI[]           = []

    newQuarks               : Map<QuarkI, {}>    = new Map()


    get calculation () : ChronoCalculationFunc {
        // lazy build
        return function * () {

        }
    }


    close () {
        this.isOpened       = false
    }


    addNewQuark (quark : QuarkI) {
        if (!this.isOpened) throw new Error("Transaction already closed")

        // this.addEdgeFrom(quark)
    }


    propagate () {
        this.close()


        // close for new quarks
        // calculate all quarks
    }

    // nodesAdded          : Set<this[ 'nodeT' ]>         = new Set()
    // nodesRemoved        : Set<this[ 'nodeT' ]>         = new Set()
    //
    // nodesChanged        : Map<this[ 'nodeT' ], { old : ChronoValue, new : ChronoValue} > = new Map()
    //
    // messages                : Map<ChronoQuark, any[]> = new Map()
    //
    // sendMessage (quark : ChronoQuark, ...args) {
    //     if (!this.isOpened) throw new Error("Invalid state")
    //
    //     this.messages.set(quark, args)
    // }
}

export type Transaction = Mixin<typeof Transaction>
export interface TransactionI extends Mixin<typeof Transaction> {}

//---------------------------------------------------------------------------------------------------------------------
export const Propagation = <T extends AnyConstructor<Base>>(base : T) =>

class Propagation extends base {
    nodeT               : Quark

    nodesAdded          : Set<this[ 'nodeT' ]>         = new Set()
    nodesRemoved        : Set<this[ 'nodeT' ]>         = new Set()

    nodesChanged        : Map<this[ 'nodeT' ], { old : ChronoValue, new : ChronoValue} > = new Map()
}

export interface Propagation extends Mixin<typeof Propagation> {}


// //---------------------------------------------------------------------------------------------------------------------
// export const History = <T extends AnyConstructor<Graph>>(base : T) =>
//
// class History extends base {
//     nodeT               : Mutation
// }
//
// export interface History extends Mixin<typeof History> {}
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export const Mutation = <T extends AnyConstructor<Node>>(base : T) =>
//
// class Mutation extends base {
//     protected isOpened    : boolean       = true
//
//
//     close () {
//         this.isOpened       = false
//     }
//
//
//     apply (to : Snapshot) {
//         if (this.isOpened) throw new Error("Invalid state")
//     }
//
//
//     unapply (from : Snapshot) {
//         if (this.isOpened) throw new Error("Invalid state")
//     }
//
//
//     calculate () {
//     }
// }
//
// export interface Mutation extends Mixin<typeof Mutation> {}
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export const ChronoQuark = <T extends AnyConstructor<HasId & Node>>(base : T) =>
//
// class ChronoQuark extends base {
//     value       : ChronoValue
//
//     graph       : Snapshot
//
//
//     get () {
//         return this.value
//     }
//
//
//     put (proposedValue : ChronoValue, ...args) {
//         this.graph.currentContext.sendMessage(this, proposedValue, ...args)
//     }
// }
//
// export interface ChronoQuark extends Mixin<typeof ChronoQuark> {}
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export const Propagation = <T extends AnyConstructor<Mutation>>(base : T) =>
//
// class Propagation extends base {
//     nodeT               : ChronoQuark
//
//     nodesAdded          : Set<this[ 'nodeT' ]>         = new Set()
//     nodesRemoved        : Set<this[ 'nodeT' ]>         = new Set()
//
//     nodesChanged        : Map<this[ 'nodeT' ], { old : ChronoValue, new : ChronoValue} > = new Map()
//
//     messages                : Map<ChronoQuark, any[]> = new Map()
//
//     sendMessage (quark : ChronoQuark, ...args) {
//         if (!this.isOpened) throw new Error("Invalid state")
//
//         this.messages.set(quark, args)
//     }
// }
//
// export interface Propagation extends Mixin<typeof Propagation> {}
//
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export const Snapshot = <T extends AnyConstructor<Graph>>(base : T) =>
//
// class Snapshot extends base {
//     nodeT               : ChronoQuark
//
//     currentContext      : Propagation       //= new PropagationContext()
//
//     // the "append-only" graph of mutations
//     history         : History
//
//     // copy-on-write source
//     basedOn         : Snapshot
//
//     // the "final" representation of this mutation
//     attachedTo      : Mutation
//
//
//     clone () : Snapshot {
//         const Self      = this.constructor as SnapshotConstructor
//
//         return Self.new({
//             basedOn     : this,
//             history     : this.history,
//             attachedTo  : this.attachedTo
//         })
//     }
//
//
//     addQuark (quark : ChronoQuark) {
//         // this.currentContext.addQuark(quark)
//     }
//
//
//     propagate () {
//         this.currentContext.calculate()
//
//         this.currentContext.apply(this)
//     }
//
//
//     removeQuark () {
//
//     }
//
// }
//
// type SnapshotConstructor = MixinConstructor<typeof Snapshot>
//
// export interface Snapshot extends Mixin<typeof Snapshot> {}
