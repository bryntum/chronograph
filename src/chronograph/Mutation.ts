import {Calculable} from "../chrono/Atom.js";
import {Input, MutationData, PureCalculation} from "../chrono/Mutation.js";
import {Constructable, Mixin} from "../class/Mixin.js";
import {ChronoGraphNode, MinimalChronoGraphNode} from "./Node.js";


//---------------------------------------------------------------------------------------------------------------------
export const ChronoMutationNode = <T extends Constructable<ChronoGraphNode & PureCalculation>>(base: T) =>

class ChronoMutationNode extends base {

    input           : Input<ChronoGraphNode>

    as              : ChronoGraphNode[]


    addEdges () {
        this.mapInput((node : ChronoGraphNode) => node.addEdgeTo(this))
        this.as.map((node : ChronoGraphNode) => this.addEdgeTo(node))
    }
}

export type ChronoMutationNode = Mixin<typeof ChronoMutationNode>


export const MinimalChronoMutationNode  = ChronoMutationNode(PureCalculation(Calculable(MutationData(MinimalChronoGraphNode))))

