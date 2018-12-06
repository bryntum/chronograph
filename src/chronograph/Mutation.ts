import {Atom, Calculable, ChronoValue, Writable} from "../chrono/Atom.js";
import {InputReference, MutationData, OutputReference} from "../chrono/Mutation.js";
import {TraceableRead} from "../chrono/Observation.js";
import {AnyFunction, AnyFunction1, Constructable, Mixin} from "../class/Mixin.js";
import {ChronoGraphNode, MinimalChronoGraphNode} from "./Node.js";


//---------------------------------------------------------------------------------------------------------------------
export const ChronoMutationNode = <T extends Constructable<ChronoGraphNode & MutationData & Calculable>>(base: T) =>

class ChronoMutationNode extends base {

    // input           : InputReference<ChronoGraphNode>
    //
    // as              : OutputReference<ChronoGraphNode>

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


    calculate () {
        // const inputNodes    = this.observeReads(this.input)
        //
        // const input         = this.mapInput(inputNodes, node => {
        //     node.get()
        // })
        //
        // const result        = Array.isArray(input) ? this.calculation.apply(this, input) : this.calculation(input)
        //
        // return this.as.map(atom => atom.set(result))
    }

    // addEdges () {
    //     this.mapInput((node : ChronoGraphNode) => node.addEdgeTo(this))
    //     this.as.map((node : ChronoGraphNode) => this.addEdgeTo(node))
    // }
}

export type ChronoMutationNode = Mixin<typeof ChronoMutationNode>


export const MinimalChronoMutationNode  = ChronoMutationNode(Calculable(MutationData(MinimalChronoGraphNode)))

