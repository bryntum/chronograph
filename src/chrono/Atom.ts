import {AnyFunction, Constructable, Mixin} from "../class/Mixin.js";
import {MinimalNode, Node} from "../graph/Node.js";
import {ChronoGraph, IChronoGraph} from "./Graph.js";
import {HasId} from "./HasId.js";

//---------------------------------------------------------------------------------------------------------------------
export type ChronoValue         = any

export type ChronoIterator<T = ChronoValue> = IterableIterator<ChronoAtom | T>

//---------------------------------------------------------------------------------------------------------------------
export type SyncChronoCalculation   = (...args) => ChronoIterator
export type AsyncChronoCalculation  = (...args) => ChronoIterator

//---------------------------------------------------------------------------------------------------------------------
export const strictEquality     = (v1, v2) => v1 === v2


//---------------------------------------------------------------------------------------------------------------------
export const strictWithDatesEquality = (v1, v2) => {
    if ((v1 instanceof Date) && (v2 instanceof Date)) return <any>v1 - <any>v2 === 0

    return v1 === v2
}


//---------------------------------------------------------------------------------------------------------------------
export const identity           = function *(v) { return v !== undefined ? v : this.value }

export const identityAsync      = function *(v) { return v !== undefined ? v : this.value }


//---------------------------------------------------------------------------------------------------------------------
export const ChronoAtom = <T extends Constructable<HasId & Node>>(base : T) =>

class ChronoAtom extends base {
    proposedValue       : ChronoValue
    nextStableValue     : ChronoValue
    value               : ChronoValue

    shouldCommitValue   : boolean   = true

    graph               : IChronoGraph

    equality            : (v1, v2) => boolean       = strictWithDatesEquality

    calculationContext  : any
    calculation         : SyncChronoCalculation     = identity
    calculationAsync    : AsyncChronoCalculation    = identityAsync

    observedDuringCalculation   :  ChronoAtom[]     = []

    intermediateAtoms : Map<string, ChronoAtom> = new Map()


    commitValue () {
        if (this.shouldCommitValue)
            this.value              = this.nextStableValue

        this.nextStableValue    = undefined
        this.proposedValue      = undefined
    }


    commitEdges () {
        this.incoming.forEach((from : ChronoAtom) => this.removeEdgeFrom(from))
        this.observedDuringCalculation.forEach((from : ChronoAtom) => this.addEdgeFrom(from))

        this.observedDuringCalculation  = []
    }


    reject () {
        this.nextStableValue            = undefined
        this.observedDuringCalculation  = []
    }


    get () : ChronoValue {
        const graph     = this.graph

        if (graph) {
            if (this.hasValue()) {
                // if (graph.isObservingRead) graph.onReadObserved(this)

                return this.nextStableValue !== undefined ? this.nextStableValue : this.value
            } else {
                return undefined
            }
        } else {
            return this.value
        }
    }


    // put (value : ChronoValue) : this {
    //     const graph     = this.graph
    //
    //     if (graph) {
    //         if (this.nextStableValue !== undefined) {
    //             if (!this.equality(value, this.nextStableValue)) {
    //                 throw new Error("Cyclic write")
    //             } else {
    //                 return this
    //             }
    //         } else {
    //             if (this.hasConsistedValue()) {
    //                 if (!this.equality(value, this.value)) {
    //                     this.update(value)
    //                 }
    //             } else {
    //                 this.update(value)
    //             }
    //         }
    //     } else {
    //         this.value  = value
    //     }
    //
    //     return this
    // }


    put (proposedValue : ChronoValue) {
        const graph             = this.graph as ChronoGraph

        if (graph) {
            this.proposedValue      = proposedValue

            graph.markAsNeedRecalculation(this)
        } else {
            this.value              = proposedValue
        }
    }


    update (value : ChronoValue) {
        this.nextStableValue  = value

        this.graph.markAsNeedRecalculation(this)
    }


    setterPropagation       : AnyFunction

    set (proposedValue? : ChronoValue, ...args) {
        const graph             = this.graph as ChronoGraph

        if (graph) {
            this.proposedValue      = proposedValue

            if (this.setterPropagation) {
                this.setterPropagation.call(this.calculationContext || this, proposedValue, ...args)
            }

            graph.markAsNeedRecalculation(this)

            graph.propagate()
        } else {
            this.value              = proposedValue
        }
    }


    hasValue () : boolean {
        return this.nextStableValue !== undefined || this.value !== undefined
    }


    hasConsistedValue () : boolean {
        return this.value !== undefined
    }


    onEnterGraph (graph : IChronoGraph) {
        this.graph      = graph
    }


    onLeaveGraph (graph : IChronoGraph) {
        this.graph      = undefined
    }

}

export type ChronoAtom = Mixin<typeof ChronoAtom>



//---------------------------------------------------------------------------------------------------------------------
export class MinimalChronoAtom extends ChronoAtom(HasId(MinimalNode)) {}


// // Intermediate values support
// //---------------------------------------------------------------------------------------------------------------------
// const intermediateAtoms : WeakMap<ChronoAtom, Map<string, any>> = new WeakMap()
//
// export const provide = (atom : ChronoAtom, tag : string, value : any) : ChronoAtom => {
//
//     const graph = atom.graph as ChronoGraph
//
//     const intermeds : Map<string, ChronoAtom> = atom.intermediateAtoms
//
//     let result : ChronoAtom = intermeds.get(tag)
//
//     if (result) {
//         result.put(value);
//         //if (!result.equality(value, result.get())) {
//         //    result.update(value)
//         //}
//     }
//     else {
//         result = MinimalChronoAtom.new({
//             value : value,
//             * calculation(proposedValue : any) {
//                 if (proposedValue === undefined) {
//                     yield atom
//                 }
//
//                 return this.value
//             }
//         })
//         // addNode() will mark atom added as need recalculation
//         graph.addNode(result)
//         intermeds.set(tag, result)
//     }
//
//     graph.markStable(result)
//
//     return result
// }
//
// export const consume = (atom : ChronoAtom, tag : string) : ChronoAtom => {
//
//     const graph = atom.graph as ChronoGraph
//
//     const intermeds : Map<string, ChronoAtom> = atom.intermediateAtoms
//
//     let result : ChronoAtom = intermeds.get(tag);
//
//     if (!result) {
//         result = MinimalChronoAtom.new({
//             * calculation(proposedValue : any) {
//                 if (proposedValue === undefined) {
//                     yield atom
//                 }
//
//                 return this.value
//             }
//         })
//         // addNode() will mark atom added as need recalculation
//         graph.addNode(result)
//         intermeds.set(tag, result)
//     }
//
//     return result;
// }
