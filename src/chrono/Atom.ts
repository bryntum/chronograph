import {AnyFunction, Constructable, Mixin} from "../class/Mixin.js";
import {MinimalNode, Node} from "../graph/Node.js";
import {WalkableBackward, WalkContext} from "../graph/Walkable.js";
import {ChronoGraph, IChronoGraph} from "./Graph.js";
import {HasId} from "./HasId.js";

//---------------------------------------------------------------------------------------------------------------------
export type ChronoValue         = any

export type ChronoIterator<T = ChronoValue>  = IterableIterator<ChronoAtom | T>

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
export const identity           = function *(v) { return v }

export const identityAsync      = function *(v) { return v }

//---------------------------------------------------------------------------------------------------------------------
// export class CalculationWalkContext extends WalkContext {
//
//     getNext (node : WalkableBackward) : WalkableBackward[] {
//         return node.getIncoming(this)
//     }
//
//     forEachNext (node : WalkableBackward, func : (node : WalkableBackward) => any) {
//         node.forEachIncoming(this, func)
//     }
// }



//---------------------------------------------------------------------------------------------------------------------
export const ChronoAtom = <T extends Constructable<HasId & Node>>(base : T) =>

class ChronoAtom extends base {
    proposedValue       : ChronoValue
    nextStableValue     : ChronoValue
    value               : ChronoValue

    graph               : IChronoGraph

    equality            : (v1, v2) => boolean       = strictWithDatesEquality

    calculationContext  : any
    calculation         : SyncChronoCalculation     = identity
    calculationAsync    : AsyncChronoCalculation    = identityAsync

    observedDuringCalculation   :  ChronoAtom[]     = []


    commit () {
        this.value              = this.nextStableValue
        this.nextStableValue    = undefined
        this.proposedValue      = undefined

        this.incoming.forEach((from : ChronoAtom) => this.removeEdgeFrom(from))
        this.observedDuringCalculation.forEach((from : ChronoAtom) => this.addEdgeFrom(from))
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


    // getCalculationGenerator () : Iterator<any> {
    //     return this.calculation(this.nextStableValue)
    // }


    // calculate (proposedValue : ChronoValue, ...args) : ChronoValue {
    //     this.graph && this.graph.startReadObservation()
    //
    //     const res       = this.calculation ? this.calculation.call(this.calculationContext || this, proposedValue, ...args) : proposedValue
    //
    //     this.observedDuringCalculation = this.graph ? this.graph.stopReadObservation() : []
    //
    //     return res
    // }
    //
    //
    // async calculateAsync (proposedValue : ChronoValue, ...args) : Promise<ChronoValue> {
    //     this.graph && this.graph.startReadObservation()
    //
    //     const res       = this.calculationAsync ? await this.calculationAsync.call(this.calculationContext || this, proposedValue, ...args) : proposedValue
    //
    //     this.observedDuringCalculation = this.graph ? this.graph.stopReadObservation() : []
    //
    //     return res
    // }


    setterPropagation       : AnyFunction

    // setter (proposedValue? : ChronoValue, ...args) {
    //     const graph             = this.graph as ChronoGraph
    //     const prevValue         = this.get()
    //     const consistentValue   = this.calculate(proposedValue, ...args)
    //
    //     if (!this.equality(consistentValue, prevValue)) {
    //         // includes "markDirty"
    //         this.update(consistentValue)
    //
    //         graph.markStable(this)
    //
    //         if (this.setterPropagation) {
    //             this.setterPropagation.call(this.calculationContext || this, proposedValue, ...args)
    //         }
    //
    //         graph.propagate()
    //     }
    // }

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

        // const prevValue         = this.get()
        // const consistentValue   = this.calculate(proposedValue, ...args)
        //
        // if (!this.equality(consistentValue, prevValue)) {
        //     // includes "markDirty"
        //     this.update(consistentValue)
        //
        //     graph.markStable(this)
        //
        //     if (this.setterPropagation) {
        //         this.setterPropagation.call(this.calculationContext || this, proposedValue, ...args)
        //     }
        //
        //     graph.propagate()
        // }
    }


    // async setterAsync (value? : ChronoValue, ...args) : Promise<void> {
    //     const graph         = this.graph as ChronoGraph
    //     const oldValue      = this.get()
    //     const newValue      = await this.calculate(value, ...args)
    //
    //     if (!this.equality(newValue, oldValue)) {
    //         // includes "markDirty"
    //         this.update(newValue)
    //
    //         graph.markStable(this)
    //
    //         if (this.setterPropagation) {
    //             this.setterPropagation.call(this.calculationContext || this, value, ...args)
    //         }
    //
    //         await graph.propagateQueueAsync()
    //     }
    // }


    // recalculate () {
    //     const graph         = this.graph as ChronoGraph
    //
    //     if (!graph.isAtomStable(this)) this.setter()
    // }
    //
    //
    // async recalculateAsync () : Promise<void> {
    //     const graph         = this.graph as ChronoGraph
    //
    //     if (!graph.isAtomStable(this)) await this.setterAsync()
    // }


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
