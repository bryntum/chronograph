import {AnyFunction, Constructable, Mixin} from "../class/Mixin.js";
import {MinimalNode, Node} from "../graph/Node.js";
import {WalkableBackward, WalkContext} from "../graph/Walkable.js";
import {ChronoGraph, IChronoGraph} from "./Graph.js";
import {HasId} from "./HasId.js";

//---------------------------------------------------------------------------------------------------------------------
export type ChronoValue         = any


//---------------------------------------------------------------------------------------------------------------------
export type SyncChronoCalculation   = (proposedValue : ChronoValue) => ChronoValue
export type AsyncChronoCalculation  = (proposedValue : ChronoValue) => Promise<ChronoValue>

//---------------------------------------------------------------------------------------------------------------------
export const strictEquality     = (v1, v2) => v1 === v2


//---------------------------------------------------------------------------------------------------------------------
export const strictWithDatesEquality = (v1, v2) => {
    if ((v1 instanceof Date) && (v2 instanceof Date)) return <any>v1 - <any>v2 === 0

    return v1 === v2
}


//---------------------------------------------------------------------------------------------------------------------
export const identity           = v => v

export const identityAsync      = v => Promise.resolve(v)

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

    graph               : IChronoGraph

    equality            : (v1, v2) => boolean       = strictWithDatesEquality


    // sync                : boolean       = true

    calculationContext  : any
    calculation         : SyncChronoCalculation     = identity
    calculationAsync    : AsyncChronoCalculation    = identityAsync

    observedDuringCalculation   :  ChronoAtom[]     = []


    commit () {
        this.value      = this.nextValue

        this.nextValue  = undefined

        this.incoming.forEach((from : ChronoAtom) => this.removeEdgeFrom(from))
        this.observedDuringCalculation.forEach((from : ChronoAtom) => this.addEdgeFrom(from))
    }


    reject () {
        this.nextValue                  = undefined
        this.observedDuringCalculation  = []
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
                // feels strange to use regular `set` inside of `get` - needs to be refactored probably
                // may be `propagate` should be always required to get the value of the computed property
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
                    return this
                }
            } else {
                if (this.hasStableValue()) {
                    if (!this.equality(value, this.value)) {
                        this.update(value)
                    }
                } else {
                    this.update(value)
                }
            }
        } else {
            this.value  = value
        }

        return this
    }


    update (value : ChronoValue) {
        this.nextValue  = value

        this.graph.markDirty(this)
    }


    setValue (value : ChronoValue) {
        this.set(value)

        this.graph && this.graph.propagate()
    }


    calculate (proposedValue : ChronoValue, ...args) : ChronoValue {
        this.graph && this.graph.startReadObservation()

        const res       = this.calculation ? this.calculation.call(this.calculationContext || this, proposedValue, ...args) : proposedValue

        this.observedDuringCalculation = this.graph ? this.graph.stopReadObservation() : []

        return res
    }


    calculateAsync (proposedValue : ChronoValue) : Promise<ChronoValue> {
        return
        // this.graph && this.graph.startReadObservation()
        //
        // const res       = this.calculation(proposedValue)
        //
        // const observed  = this.graph ? this.graph.stopReadObservation() : []
        //
        // this.incoming.forEach((from : ChronoAtom) => this.removeEdgeFrom(from))
        // observed.forEach((from : ChronoAtom) => this.addEdgeFrom(from))
        //
        // return res
    }


    setterPropagation       : AnyFunction

    setter (value? : ChronoValue, ...args) {
        const graph         = this.graph as ChronoGraph
        const oldValue      = this.get()
        const newValue      = this.calculate(value, ...args)

        if (!this.equality(newValue, oldValue)) {
            // includes "markDirty"
            this.update(newValue)

            graph.markStable(this)

            if (this.setterPropagation) {
                this.setterPropagation.call(this.calculationContext || this, value, ...args)
            }

            graph.propagateQueue()
        }
    }


    recalculate () {
        const graph         = this.graph as ChronoGraph

        if (!graph.isAtomStable(this)) this.setter()
    }


    hasValue () : boolean {
        return this.nextValue !== undefined || this.value !== undefined
    }


    hasStableValue () : boolean {
        return this.value !== undefined
    }


    isDirty () : boolean {
        return this.nextValue !== undefined
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
