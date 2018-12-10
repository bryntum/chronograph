import {ChronoValue} from "../chrono/Atom.js";
import {ChronoId} from "../chrono/Id.js";
import {Immutable, MinimalImmutable, MutableBoxWithCandidate} from "../chrono/Immutable.js";
import {MinimalMutableBox} from "../chrono/MutableBox.js";
import {ObservableRead, ObservableWrite} from "../chrono/Observation.js";
import {Constructable, Mixin, MixinConstructor} from "../class/Mixin.js";
import {Graph} from "../graph/Graph.js";
import {Walkable, WalkableBackward, WalkableForward, WalkBackwardContext} from "../graph/Walkable.js";
import {Box, MinimalBox} from "./Box.js";
import {HasId} from "./HasId.js";
import {ChronoMutationNode, MinimalChronoMutationNode} from "./Mutation.js";
import {ChronoGraphNode, MinimalChronoGraphNode} from "./Node.js";


//---------------------------------------------------------------------------------------------------------------------
export const GraphBox = <T extends Constructable<Graph & HasId & MutableBoxWithCandidate & ObservableRead & ObservableWrite>>(base : T) =>

class GraphBox extends base {
    cls             : GraphSnapshotConstructor  = MinimalGraphSnapshot

    value           : GraphSnapshot

    // a still mutable "next" version of the graph
    candidate       : GraphSnapshot


    nodes           : Set<Box>              = new Set()
    nodesMap        : Map<ChronoId, Box>    = new Map()



    // this config will ensure the box will create an empty graph snapshot when instantiated
    value$          : ChronoValue   = null


    currentObservationState         = []


    observeRead (box : Box) {
        this.currentObservationState.push(box)
    }


    observeWrite (value : ChronoValue, box : Box) {
        if (box !== <any>this && !this.getCandidate().hasDirectNode(box.value)) this.addCandidateNode(box.value)
    }


    startReadObservation () {

    }


    addNode (box : Box) : Box {
        if (this.hasBox(box.id)) return box

        this.nodesMap.set(box.id, box)

        if (box.isResolved()) {
            this.addCandidateNode(box.value)
        } else {
            box.value   = MinimalChronoGraphNode.new({ id : box.id })

            this.addCandidateNode(box.value)
        }

        box.graph   = this

        return box
    }


    hasNodeById (id : ChronoId) : boolean {
        return this.nodesMap.has(id)
    }


    getNodeById (id : ChronoId) : Box {
        return this.nodesMap.get(id)
    }


    hasBox (id : ChronoId) {
        return this.hasNodeById(id)
    }


    addBox (box : Box) : Box {
        return this.addNode(box)
    }


    getBox (id : ChronoId) : Box {
        const box       = this.getNodeById(id)

        if (box) return box

        return this.addBox(MinimalBox.new({ id : id }))
    }



    addCandidateNode (node : ChronoGraphNode) {
        this.getCandidate().addNode(node)
    }


    addMutation (mutation : ChronoMutationNode) {
        this.addCandidateNode(mutation)

        mutation.addEdges()
    }


    runMutation (func : () => any) {
        // this.addNode(mutation)
        //
        // mutation.addEdges()
    }


    propagate () : this {
        const candidate         = this.getCandidate()

        candidate.propagate()

        this.commit()

        return this
    }
}

export type GraphBox                    = Mixin<typeof GraphBox>

export const MinimalGraphBox            = GraphBox(Graph(WalkableBackward(WalkableForward(Walkable(ObservableRead(ObservableWrite(HasId(MutableBoxWithCandidate(MinimalMutableBox)))))))))
export type MinimalGraphBox             = InstanceType<typeof MinimalGraphBox>




//---------------------------------------------------------------------------------------------------------------------
export const GraphSnapshot = <T extends Constructable<Graph & Immutable>>(base : T) =>

class GraphSnapshot extends base {

    nodes           : Set<ChronoGraphNode>          = new Set()


    // used during "commit"
    hasValue () {
        return this.nodes.size > 0
    }


    propagate () {

        this.walkDepth(WalkBackwardContext.new({
            onNode                  : (node : ChronoGraphNode) => null,//console.log(`Visiting node ${node.id}, version : ${node.version}`),
            onCycle                 : () => { throw new Error("Cycle in graph") },

            onTopologicalNode       : (node : ChronoGraphNode) => {
                if (<any>node === <any>this) return

                // console.log(`Visiting TOPO [${node}]`)

                if (node instanceof MinimalChronoMutationNode) {

                    let someIsDirty     = false

                    node.mapInput(node.input, (box : Box) => {
                        if (this.hasDirectNode(box.value)) someIsDirty = true
                    })

                    if (someIsDirty) {
                        const resultNodes   = node.calculate() as ChronoGraphNode[]

                        resultNodes.forEach((resultNode, index) => {
                            // if the new atom has been created for the output, add it to graph
                            // if (resultNode !== node.output[ index ])

                            if (!this.hasDirectNode(resultNode)) this.addNode(resultNode)
                        })
                    }
                }
            }
        }))
    }

}

export type GraphSnapshot               = Mixin<typeof GraphSnapshot>
export type GraphSnapshotConstructor    = MixinConstructor<typeof GraphSnapshot>

export const MinimalGraphSnapshot       = GraphSnapshot(Graph(WalkableForward(WalkableBackward(Walkable(MinimalImmutable)))))
export type MinimalGraphSnapshot        = InstanceType<typeof MinimalGraphSnapshot>
