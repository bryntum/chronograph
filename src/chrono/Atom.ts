import {AnyFunction, Constructable, Mixin} from "../class/Mixin.js";
import {MinimalNode, Node} from "../graph/Node.js";
import {ChronoGraph, IChronoGraph} from "./Graph.js";
import {HasId} from "./HasId.js";

//---------------------------------------------------------------------------------------------------------------------
export type ChronoValue         = any

export type ChronoIterator<T = ChronoValue> = IterableIterator<ChronoAtom | T>

//---------------------------------------------------------------------------------------------------------------------
export type SyncChronoCalculation   = (...args) => ChronoIterator

//---------------------------------------------------------------------------------------------------------------------
export const strictEquality     = (v1, v2) => v1 === v2

export const strictEqualityWithDates = (v1, v2) => {
    if ((v1 instanceof Date) && (v2 instanceof Date)) return <any>v1 - <any>v2 === 0

    return v1 === v2
}


//---------------------------------------------------------------------------------------------------------------------
export const ChronoAtom = <T extends Constructable<HasId & Node>>(base : T) =>

class ChronoAtom extends base {
    proposedArgs        : ChronoValue[]
    proposedValue       : ChronoValue
    nextStableValue     : ChronoValue
    value               : ChronoValue

    shouldCommitValue   : boolean   = true

    graph               : IChronoGraph

    equality            : (v1, v2) => boolean       = strictEqualityWithDates

    calculationContext  : any
    calculation         : SyncChronoCalculation

    observedDuringCalculation   :  ChronoAtom[]     = []

    // intermediateAtoms : Map<string, ChronoAtom> = new Map()


    readValue () : ChronoValue {
        return this.value
    }


    writeValue (value : ChronoValue) {
        this.value  = value
    }


    * calculate (proposedValue : this[ 'value' ]) : IterableIterator<ChronoAtom | this[ 'value' ]> {
        if (this.calculation) {
            return yield* this.calculation.call(this.calculationContext || this, proposedValue)
        } else
            // identity case
            return proposedValue !== undefined ? proposedValue : this.readValue()
    }


    commitValue () {
        const nextStableValue   = this.nextStableValue

        this.nextStableValue    = undefined
        this.proposedValue      = undefined
        this.proposedArgs       = undefined

        if (this.shouldCommitValue) this.writeValue(nextStableValue)
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

    hasValue () : boolean {
        return this.hasNextStableValue() || this.hasProposedValue() || this.hasConsistentValue()
    }


    hasNextStableValue () : boolean {
        return this.nextStableValue !== undefined
    }


    hasConsistentValue () : boolean {
        return this.readValue() !== undefined
    }


    hasProposedValue () : boolean {
        return this.proposedArgs !== undefined
    }


    get () : ChronoValue {
        if (this.hasNextStableValue()) {
            return this.getNextStableValue()
        }
        else if (this.hasProposedValue()) {
            return this.getProposedValue()
        }
        else {
            return this.getConsistentValue()
        }
    }


    put (proposedValue : ChronoValue, ...args) {
        const graph                 = this.graph as ChronoGraph

        if (graph) {
            this.proposedValue      = proposedValue
            this.proposedArgs       = Array.prototype.slice.call(arguments)

            graph.markAsNeedRecalculation(this)
        } else {
            this.writeValue(proposedValue)
        }
    }

    getNextStableValue () : ChronoValue {
        return this.nextStableValue
    }

    getConsistentValue () : ChronoValue {
        return this.readValue()
    }

    getProposedValue () : ChronoValue {
        return this.proposedValue
    }

    // setterPropagation       : AnyFunction

    set (proposedValue? : ChronoValue, ...args) : Promise<any> {
        const graph             = this.graph as ChronoGraph

        this.put(proposedValue, ...args)

        let result : Promise<any>;

        if (graph) {
            result = graph.propagate()
        }
        else {
            result = Promise.resolve()
        }

        return result
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
