import {Calculable, ChronoValue} from "../chrono/Atom.js";
import {Input, MutationData, Output} from "../chrono/MutationData.js";
import {AnyFunction, AnyFunction1, Constructable, Mixin} from "../class/Mixin.js";
import {Box} from "./Box.js";
//---------------------------------------------------------------------------------------------------------------------
import {ChronoGraphNode, MinimalChronoGraphNode} from "./Node.js";

export const ChronoMutationNode = <T extends Constructable<ChronoGraphNode & MutationData & Calculable>>(base: T) =>

class ChronoMutationNode extends base {

    input           : Input<Box>

    output          : Output<Box>

    calculation     : AnyFunction1<ChronoValue>


    observeReads (func : AnyFunction) {
        // const observedAtoms : TraceableRead[]    = []
        //
        // some.onread = (atom) = {
        //     observedAtoms.push(atom)
        // }
        //
        // func()
        //
        // return observedAtoms
    }


    calculate () : Output<ChronoGraphNode> {
        const input     = this.mapInput(this.input, box => box.get())

        const result    = Array.isArray(input) ? this.calculation.apply(this, input) : this.calculation(input)

        return this.output.map(box => {
            box.set(result)

            return box.value
        })
    }

    // calculate () : Output<ChronoGraphNode> {
    //     const input         = this.mapInput(this.inputRef(), box => box.get())
    //
    //     const result        = Array.isArray(input) ? this.calculation.apply(this, input) : this.calculation(input)
    //
    //     return this.outputRef().map(box => {
    //         box.set(result)
    //
    //         return box.value
    //     })
    // }


    addEdges () {
        this.mapInput(this.input, (node : Box) => node.value.addEdgeTo(this))
        this.output.map((node : Box) => this.addEdgeTo(node.value))
    }
}

export type ChronoMutationNode = Mixin<typeof ChronoMutationNode>


export const MinimalChronoMutationNode  = ChronoMutationNode(Calculable(MutationData(MinimalChronoGraphNode)))

