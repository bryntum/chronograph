import {AnyConstructor, Mixin} from "../class/Mixin.js";
import {MinimalNode, Node} from "../graph/Node.js";
import {Effect} from "./Effect.js";
import {ChronoGraphI, PropagationResult} from "./Graph.js";
import {HasId} from "./HasId.js";

//---------------------------------------------------------------------------------------------------------------------
export type ChronoValue         = any

export type ChronoIterator<T = ChronoValue> = IterableIterator<ChronoAtom | Effect | T>

//---------------------------------------------------------------------------------------------------------------------
export type ChronoCalculation   = (...args) => ChronoIterator

//---------------------------------------------------------------------------------------------------------------------
export const strictEquality     = (v1, v2) => v1 === v2

export const strictEqualityWithDates = (v1, v2) => {
    if ((v1 instanceof Date) && (v2 instanceof Date)) return <any>v1 - <any>v2 === 0

    return v1 === v2
}


//---------------------------------------------------------------------------------------------------------------------
export const ChronoAtom = <T extends AnyConstructor<HasId & Node>>(base : T) =>

class ChronoAtom extends base {
    proposedArgs        : ChronoValue[]
    proposedValue       : ChronoValue

    nextStableValue     : ChronoValue
    value               : ChronoValue

    shouldCommitValue   : boolean   = true

    graph               : ChronoGraphI

    equality            : (v1, v2) => boolean       = strictEqualityWithDates

    calculationContext  : any
    calculation         : ChronoCalculation

    observedDuringCalculation   :  ChronoAtom[]     = [];



    * calculate (proposedValue : this[ 'value' ]) : IterableIterator<ChronoAtom | this[ 'value' ]> {
        if (this.calculation) {
            return yield* this.calculation.call(this.calculationContext || this, proposedValue)
        } else
            // identity-like case, translates to user-provided or current value
            return proposedValue !== undefined ? proposedValue : this.value
    }


    clearUserInput () {
        this.proposedValue      = undefined
        this.proposedArgs       = undefined
    }


    commitValue () {
        const nextStableValue   = this.nextStableValue

        this.nextStableValue    = undefined

        // this assignment may cause side effects (when using delegated storage)
        // so we do it after the `this.nextStableValue` is cleared
        if (this.shouldCommitValue) this.value = nextStableValue
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


    hasStableValue () : boolean {
        return this.hasNextStableValue() || this.hasConsistentValue()
    }


    hasNextStableValue () : boolean {
        return this.nextStableValue !== undefined
    }


    hasConsistentValue () : boolean {
        return this.value !== undefined
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
        const graph                 = this.graph

        if (graph) {
            this.proposedValue      = proposedValue
            this.proposedArgs       = Array.prototype.slice.call(arguments)

            graph.markAsNeedRecalculation(this)
        } else {
            this.value              = proposedValue
        }
    }


    getNextStableValue () : ChronoValue {
        return this.nextStableValue
    }


    getConsistentValue () : ChronoValue {
        return this.value
    }


    getProposedValue () : ChronoValue {
        return this.proposedValue
    }


    async set (proposedValue : ChronoValue, ...args) : Promise<PropagationResult> {
        const graph             = this.graph

        this.put(proposedValue, ...args)

        return graph ? graph.propagate() : Promise.resolve(PropagationResult.Completed)
    }


    onEnterGraph (graph : ChronoGraphI) {
        this.graph      = graph
    }


    onLeaveGraph (graph : ChronoGraphI) {
        this.graph      = undefined
    }

}

export type ChronoAtom = Mixin<typeof ChronoAtom>
export interface ChronoAtomI extends Mixin<typeof ChronoAtom> {}


//---------------------------------------------------------------------------------------------------------------------
export class MinimalChronoAtom extends ChronoAtom(HasId(MinimalNode)) {}
