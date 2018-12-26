import {Calculable, ChronoValue} from "../chrono/Atom.js";
import {Input, MutationData, Output} from "../chrono/MutationData.js";
import {AnyFunction1, Constructable, Mixin} from "../class/Mixin.js";
import {Node, WalkableBackwardNode} from "../graph/Node.js";
import {WalkBackwardContext, WalkContext} from "../graph/Walkable.js";
import {Box, MinimalBox} from "./Box.js";
import {GraphSnapshot} from "./Graph.js";
import {ChronoGraphNode, MinimalChronoGraphNode} from "./Node.js";

//---------------------------------------------------------------------------------------------------------------------
export const ChronoMutationBox = <T extends Constructable<Box & MutationData & Calculable>>(base: T) =>

class ChronoMutationBox extends base {

    input           : Input<Box>

    output          : Output<Box>

    calculation     : AnyFunction1<ChronoValue>

    timesCalculated : number        = 0


    addEdges () {
        this.mapInput(this.input, (box : Box) => box.addEdgeTo(this))
        this.output.map((box : Box) => this.addEdgeTo(box))
    }


    removeEdges () {
        this.mapInput(this.input, (box : Box) => box.removeEdgeTo(this))
        this.output.map((box : Box) => this.removeEdgeTo(box))
    }


    calculate () : Output<ChronoGraphNode> {
        const input     = this.mapInput(this.input, box => box.get())

        const result    = Array.isArray(input) ? this.calculation.apply(this, input) : this.calculation(input)

        this.timesCalculated++

        return this.output.map(box => {
            box.set(result)

            return box.value
        })
    }


    needsRecalculation (graph : GraphSnapshot) : boolean {
        if (this.timesCalculated === 0) return true

        let someIsDirty     = false

        this.mapInput(this.input, (box : Box) => {
            if (graph.hasDirectNode(box.value)) { someIsDirty = true }
        })

        return someIsDirty
    }
}

export type ChronoMutationBox = Mixin<typeof ChronoMutationBox>


export const MinimalChronoMutationBox   = ChronoMutationBox(MutationData(Calculable(MinimalBox)))
export type MinimalChronoMutationBox    = InstanceType<typeof MinimalChronoMutationBox>




//---------------------------------------------------------------------------------------------------------------------
export const ChronoBehavior = <T extends Constructable<Node & MutationData & Calculable>>(base: T) =>

class ChronoBehavior extends base {
    edgesStorage    : string    = 'inputs'

    input           : Input<Box>

    inputs          : Set<Box>      = new Set()

    calculation     : AnyFunction1<ChronoMutationBox[]>

    timesCalculated : number        = 0


    calculate () : Output<ChronoMutationBox> {
        const input     = this.mapInput(this.input, box => box.get())

        const result    = Array.isArray(input) ? this.calculation.apply(this, input) : this.calculation(input)

        this.timesCalculated++

        return result
    }


    needsRecalculation (graph : GraphSnapshot) : boolean {
        if (this.timesCalculated === 0) return true

        let someIsDirty     = false

        this.mapInput(this.input, (box : Box) => {
            if (graph.hasDirectNode(box.value)) { someIsDirty = true }
        })

        return someIsDirty
    }


    addEdges () {
        this.mapInput(this.input, (node : Box) => {
            node.toBehavior.add(this)

            this.inputs.add(node)
        })
    }


    getIncoming () {
        return this.input
    }


    forEachIncoming(context : WalkContext, func : (Box) => any) {
        this.input.forEach(func)
    }


    getOutgoing () {
        return []
    }


    forEachOutgoing(context : WalkContext, func : (Box) => any) {
    }

}

export type ChronoBehavior = Mixin<typeof ChronoBehavior>


export const MinimalChronoBehavior  = ChronoBehavior(Calculable(MutationData(MinimalChronoGraphNode)))

