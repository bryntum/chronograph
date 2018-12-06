import {ChronoValue} from "../chrono/Atom.js";
import {ChronoId} from "../chrono/Id.js";
import {Immutable, MinimalImmutable, MutableBoxWithCandidate} from "../chrono/Immutable.js";
import {MinimalMutableBox} from "../chrono/MutableBox.js";
import {ObservableRead, ObservableWrite} from "../chrono/Observation.js";
import {Constructable, Mixin, MixinConstructor} from "../class/Mixin.js";
import {Graph} from "../graph/Graph.js";
import {Walkable, WalkableBackward, WalkableForward, WalkBackwardContext} from "../graph/Walkable.js";
import {Box, MinimalBox} from "./Box.js";
import {ChronoMutationNode, MinimalChronoMutationNode} from "./Mutation.js";
import {ChronoGraphNode, MinimalChronoGraphNode} from "./Node.js";


//---------------------------------------------------------------------------------------------------------------------
export const GraphBox = <T extends Constructable<MutableBoxWithCandidate & ObservableRead & ObservableWrite>>(base : T) =>

class GraphBox extends base {
    cls             : GraphSnapshotConstructor  = MinimalGraphSnapshot

    value           : GraphSnapshot

    // a still mutable "next" version of the graph
    candidate       : GraphSnapshot


    allWatchedBoxes     : Map<ChronoId, Box>        = new Map()



    // this config will ensure the box will create an empty graph snapshot when instantiated
    value$          : ChronoValue   = null


    currentObservationState         = []


    observeRead (box : Box) {
        this.currentObservationState.push(box)
    }


    observeWrite (box : Box) {

    }


    startReadObservation () {

    }


    addBox (box : Box) : Box {
        if (box.isResolved()) {
            // if (!this.candidate.hasDirectNode())
            this.addNode(box.value)
        } else {
            box.value   = MinimalChronoGraphNode.new()

            this.addNode(box.value)
        }

        box.graph   = this

        return box
    }


    getBox (id : ChronoId) : Box {
        const box       = this.allWatchedBoxes.get(id)

        if (box) return box

        return this.addBox(MinimalBox.new({ id : id }))
    }



    addNode (node : ChronoGraphNode) {
        this.getCandidate().addNode(node)
    }


    addMutation (mutation : ChronoMutationNode) {
        this.addNode(mutation)

        mutation.addEdges()
    }


    propagate () : this {
        const candidate         = this.getCandidate()

        candidate.propagate()

        this.commit()

        return this
    }
}

export type GraphBox                    = Mixin<typeof GraphBox>

export const MinimalGraphBox            = GraphBox(MutableBoxWithCandidate(ObservableRead(ObservableWrite(MinimalMutableBox))))
export type MinimalGraphBox             = InstanceType<typeof MinimalGraphBox>




//---------------------------------------------------------------------------------------------------------------------
export const GraphSnapshot = <T extends Constructable<Graph & Immutable>>(base : T) =>

class GraphSnapshot extends base {

    nodes           : Set<ChronoGraphNode>          = new Set()


    hasValue () {
        return this.nodes.size > 0
    }


    propagate () {

        this.walkDepth(WalkBackwardContext.new({
            onNode                  : (node : ChronoGraphNode) => null,//console.log(`Visiting node ${node.id}, version : ${node.version}`),
            onCycle                 : () => { throw new Error("Cycle in graph") },

            onTopologicalNode       : (node : ChronoGraphNode) => {
                // console.log(`Visiting TOPO [${node}]`)

                if (node instanceof MinimalChronoMutationNode) {
                    const resultAtoms   = node.calculate() as ChronoGraphNode[]

                    resultAtoms.forEach((node, index) => {
                        // if the new atom has been created for the output, add it to graph
                        // if (atom !== node.as[ index ])

                        if (!this.hasDirectNode(node)) this.addNode(node)
                    })
                }
            }
        }))
    }

}

export type GraphSnapshot               = Mixin<typeof GraphSnapshot>
export type GraphSnapshotConstructor    = MixinConstructor<typeof GraphSnapshot>

export const MinimalGraphSnapshot       = GraphSnapshot(Graph(WalkableForward(WalkableBackward(Walkable(MinimalImmutable)))))
export type MinimalGraphSnapshot        = InstanceType<typeof MinimalGraphSnapshot>
