import {ChronoValue} from "../chrono/Atom.js";
import {Immutable, MinimalImmutable} from "../chrono/Immutable.js";
import {MinimalMutableBox, MutableBox} from "../chrono/MutableBox.js";
import {Constructable, Mixin, MixinConstructor} from "../class/Mixin.js";
import {Graph} from "../graph/Graph.js";
import {Walkable, WalkableBackward, WalkableForward, WalkBackwardContext} from "../graph/Walkable.js";
import {ChronoMutationNode, MinimalChronoMutationNode} from "./Mutation.js";
import {ChronoGraphNode} from "./Node.js";


//---------------------------------------------------------------------------------------------------------------------
export const GraphBox = <T extends Constructable<MutableBox>>(base : T) =>

class GraphBox extends base {
    cls             : GraphSnapshotConstructor  = MinimalGraphSnapshot

    value           : GraphSnapshot

    // a still mutable "next" version of the graph
    candidate       : GraphSnapshot



    // this config will ensure the box will create an empty graph snapshot when instantiated
    value$          : ChronoValue   = null


    getCandidate () : GraphSnapshot {
        return this.candidate || (this.candidate = this.value.next(null))
    }


    addNode (node : ChronoGraphNode) {
        this.getCandidate().addNode(node)
    }


    addMutation (mutation : ChronoMutationNode) {
        // this.addNode(mutation)
        //
        // mutation.addEdges()
    }


    commit () {
        const candidate         = this.getCandidate()

        if (candidate.getNodes().size > 0) {
            this.candidate      = null

            super.set(candidate)
        }
    }


    reject () {
        this.candidate          = null
    }


    propagate () : this {
        const candidate         = this.getCandidate()

        candidate.propagate()

        this.commit()

        return this
    }
}

export type GraphBox                    = Mixin<typeof GraphBox>

export const MinimalGraphBox            = GraphBox(MinimalMutableBox)
export type MinimalGraphBox             = InstanceType<typeof MinimalGraphBox>




//---------------------------------------------------------------------------------------------------------------------
export const GraphSnapshot = <T extends Constructable<Graph & Immutable>>(base : T) =>

class GraphSnapshot extends base {
    nodes           : Set<ChronoGraphNode>          = new Set()

    propagate () {

        this.walkDepth(WalkBackwardContext.new({
            onNode                  : (node : ChronoGraphNode) => null,//console.log(`Visiting node ${node.id}, version : ${node.version}`),
            onCycle                 : () => { throw new Error("Cycle in graph") },

            onTopologicalNode       : (node : ChronoGraphNode) => {
                // console.log(`Visiting TOPO [${node}]`)

                if (node instanceof MinimalChronoMutationNode) {
                    // const resultAtoms   = node.calculate() as ChronoGraphNode[]
                    //
                    // resultAtoms.forEach((atom, index) => {
                    //     // if the new atom has been created for the output, add it to graph
                    //     if (atom !== node.as[ index ]) this.addNode(atom)
                    // })
                }
            }
        }))
    }

}

export type GraphSnapshot               = Mixin<typeof GraphSnapshot>
export type GraphSnapshotConstructor    = MixinConstructor<typeof GraphSnapshot>


export const MinimalGraphSnapshot       = GraphSnapshot(Graph(WalkableForward(WalkableBackward(Walkable(MinimalImmutable)))))
export type MinimalGraphSnapshot        = InstanceType<typeof MinimalGraphSnapshot>
