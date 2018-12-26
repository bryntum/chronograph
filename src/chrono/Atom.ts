import {Constructable, Mixin} from "../class/Mixin.js";
import {MinimalNode, Node} from "../graph/Node.js";
import {WalkableBackward, WalkContext} from "../graph/Walkable.js";
import {IChronoGraph} from "./Graph.js";
import {HasId} from "./HasId.js";

//---------------------------------------------------------------------------------------------------------------------
export type ChronoValue         = any


//---------------------------------------------------------------------------------------------------------------------
export type ChronoCalculation   = (proposedValue : ChronoValue) => ChronoValue

export const strictEquality     = (v1, v2) => v1 === v2


//---------------------------------------------------------------------------------------------------------------------
export class CalculationWalkContext extends WalkContext {

    getNext (node : WalkableBackward) : WalkableBackward[] {
        return node.getIncoming(this)
    }

    forEachNext (node : WalkableBackward, func : (node : WalkableBackward) => any) {
        node.forEachIncoming(this, func)
    }
}



//---------------------------------------------------------------------------------------------------------------------
export const ChronoAtom = <T extends Constructable<HasId & Node>>(base : T) =>

class ChronoAtom extends base {
    nextValue           : ChronoValue
    value               : ChronoValue

    lazy                : boolean       = false

    graph               : IChronoGraph

    equality            : (v1, v2) => boolean = strictEquality


    calculation         : ChronoCalculation


    // initialize (...args) {
    //     super.initialize(...args)
    //
    //     if (!this.hasStableValue() && !this.lazy && this.calculation) this.set(this.calculate(undefined))
    // }


    commit () {
        this.value      = this.nextValue

        this.nextValue  = undefined
    }


    reject () {
        this.nextValue  = undefined
    }


    get () : ChronoValue {
        const graph     = this.graph

        if (graph) {
            if (this.hasValue()) {
                if (graph.isObservingRead) graph.onReadObserved(this)

                return this.nextValue !== undefined ? this.nextValue : this.value
            } else {
                const value     = this.calculate(undefined)

                // this is "cached" behavior
                // one more possibility would be to just return the calculated value and not cache it
                this.set(value)

                if (graph.isObservingRead) graph.onReadObserved(this)

                return value
            }
        } else {
            return this.value
        }
    }


    set (value : ChronoValue) : this {
        const graph     = this.graph

        if (graph) {
            if (this.nextValue !== undefined) {
                if (!this.equality(value, this.nextValue)) {
                    throw new Error("Cyclic write")
                } else {
                    return
                }
            } else {
                if (this.hasStableValue()) {
                    if (!this.equality(value, this.value)) {
                        this.nextValue  = value

                        graph.markDirty(this)
                    }
                } else {
                    this.nextValue  = value

                    graph.markDirty(this)
                }
            }
        } else {
            this.value  = value
        }

        return this
    }


    setValue (value : ChronoValue) {
        this.set(value)

        this.graph && this.graph.propagate()
    }


    calculate (proposedValue : ChronoValue) : ChronoValue {
        this.graph && this.graph.startReadObservation()

        this.incoming.forEach((from : ChronoAtom) => this.removeEdgeFrom(from))

        const res       = this.calculation ? this.calculation(proposedValue) : proposedValue

        const observed  = this.graph ? this.graph.stopReadObservation() : []

        observed.forEach((from : ChronoAtom) => this.addEdgeFrom(from))

        return res
    }


    // propagate () {
    //     const graph     = this.graph
    //
    //     if (!graph) return
    //
    //
    //     // graph.
    //     //
    //     // this.outgoing.forEach((to : ChronoAtom) => {
    //     //
    //     // })
    // }


    hasValue () : boolean {
        return this.nextValue !== undefined || this.value !== undefined
    }


    hasStableValue () : boolean {
        return this.value !== undefined
    }


    isDirty () : boolean {
        return this.nextValue !== undefined
    }


    joinGraph (graph : IChronoGraph) {
        this.graph      = graph

        if (!this.hasStableValue() && !this.lazy && this.calculation) this.set(this.calculate(undefined))
    }


    unjoinGraph (graph : IChronoGraph) {
        this.graph      = undefined
    }

}

export type ChronoAtom = Mixin<typeof ChronoAtom>


//---------------------------------------------------------------------------------------------------------------------
export const MinimalChronoAtom = ChronoAtom(HasId(MinimalNode))



