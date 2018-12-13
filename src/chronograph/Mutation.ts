import {Calculable, ChronoValue} from "../chrono/Atom.js";
import {Input, MutationData, Output} from "../chrono/MutationData.js";
import {AnyFunction1, Constructable, Mixin} from "../class/Mixin.js";
import {WalkableBackwardNode} from "../graph/Node.js";
import {Box, MinimalBox} from "./Box.js";
import {GraphSnapshot} from "./Graph.js";
import {ChronoGraphNode, MinimalChronoGraphNode} from "./Node.js";

//---------------------------------------------------------------------------------------------------------------------
export const ChronoMutationBox = <T extends Constructable<Box & MutationData & Calculable>>(base: T) =>

class ChronoMutationBox extends base {

    input           : Input<Box>

    output          : Output<Box>

    calculation     : AnyFunction1<ChronoValue>


    addEdges () {
        this.mapInput(this.input, (box : Box) => box.addEdgeTo(this))
        this.output.map((box : Box) => this.addEdgeTo(box))
    }


    calculate () : Output<ChronoGraphNode> {
        const input     = this.mapInput(this.input, box => box.get())

        const result    = Array.isArray(input) ? this.calculation.apply(this, input) : this.calculation(input)

        return this.output.map(box => {
            box.set(result)

            return box.value
        })
    }


    referencesChangedData (graph : GraphSnapshot) : boolean {
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
export const ChronoBehavior = <T extends Constructable<WalkableBackwardNode & MutationData & Calculable>>(base: T) =>

class ChronoBehavior extends base {
    edgesStorage    : string    = 'inputs'

    input           : Input<Box>

    inputs          : Set<Box>

    calculation     : AnyFunction1<ChronoValue>


    calculate () : Output<ChronoMutationBox[]> {
        const input     = this.mapInput(this.input, box => box.get())

        const result    = Array.isArray(input) ? this.calculation.apply(this, input) : this.calculation(input)

        return result
    }


    referencesChangedData (graph : GraphSnapshot) : boolean {
        let someIsDirty     = false

        this.mapInput(this.input, (box : Box) => {
            if (graph.hasDirectNode(box.value)) { someIsDirty = true }
        })

        return someIsDirty
    }


    addEdges () {
        this.mapInput(this.input, (node : Box) => this.addEdgeFrom(node))
        // this.output.map((node : Box) => this.addEdgeTo(node.value))
    }


    getIncoming () {
        return this.input
    }
}

export type ChronoBehavior = Mixin<typeof ChronoBehavior>


export const MinimalChronoBehavior  = ChronoBehavior(Calculable(MutationData(MinimalChronoGraphNode)))

