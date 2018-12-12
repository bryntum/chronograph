import {ChronoValue} from "../chrono/Atom.js";
import {ChronoId} from "../chrono/Id.js";
import {Immutable, MinimalImmutable, MutableBoxWithCandidate} from "../chrono/Immutable.js";
import {MinimalMutableBox} from "../chrono/MutableBox.js";
import {ObservableRead, ObservableWrite} from "../chrono/Observation.js";
import {AnyFunction1, Constructable, Mixin, MixinConstructor} from "../class/Mixin.js";
import {Graph} from "../graph/Graph.js";
import {Walkable, WalkableBackward, WalkableForward, WalkBackwardContext, WalkForwardContext} from "../graph/Walkable.js";
import {Box, MinimalBox} from "./Box.js";
import {HasId} from "./HasId.js";
import {ChronoMutationBox, MinimalChronoMutationBox, MinimalChronoMutationNode} from "./Mutation.js";
import {ChronoGraphNode, MinimalChronoGraphNode} from "./Node.js";


//---------------------------------------------------------------------------------------------------------------------
export const GraphBox = <T extends Constructable<Graph & HasId & MutableBoxWithCandidate & ObservableRead & ObservableWrite>>(base : T) =>

class GraphBox extends base {
    cls             : GraphSnapshotConstructor  = MinimalGraphSnapshot

    value           : GraphSnapshot

    // a still mutable "next" version of the graph
    candidate       : GraphSnapshot


    // TODO one of these two is enough
    nodes           : Set<Box>              = new Set()
    nodesMap        : Map<ChronoId, Box>    = new Map()

    // mutationReferencingInput    : Map<ChronoId, Set<ChronoMutationBox>> = new Map()
    // mutationReferencingOutput   : Map<ChronoId, Set<ChronoMutationBox>> = new Map()

    mutations       : Set<ChronoMutationBox>    = new Set()


    // this config will ensure the box will create an empty graph snapshot when instantiated
    value$          : ChronoValue   = null


    currentObservationState     : Box[]     = []
    isObserving                 : number    = 0


    observeRead (box : Box) {
        this.isObserving && this.currentObservationState.push(box)
    }


    observeWrite (value : ChronoValue, box : Box) {
        if (box !== <any>this && !this.getCandidate().hasDirectNode(box.value)) this.addCandidateNode(box.value)
    }


    startReadObservation () {
        this.isObserving++
    }


    stopReadObservation () {
        this.isObserving--
    }


    compute (box : Box, calculation : AnyFunction1<ChronoValue>) {
        this.startReadObservation()

        const result        = calculation.call(this)

        this.stopReadObservation()

        this.addMutation(MinimalChronoMutationBox.new({
            input           : this.currentObservationState,
            output          : [ box ],

            calculation     : calculation
        }))

        this.currentObservationState    = []

        box.set(result)

        return this.addCandidateNode(box.value)
    }


    addMutation (mutation : ChronoMutationBox) {
        // this.mutations.add(mutation)

        mutation.addEdges()

        // mutation.mapInput(mutation.input, (box : Box) => {
        //     let refsInput       = this.mutationReferencingInput.get(box.id)
        //
        //     if (!refsInput) {
        //         refsInput       = new Set<ChronoMutationBox>()
        //
        //         this.mutationReferencingInput.set(box.id, refsInput)
        //     }
        //
        //     refsInput.add(mutation)
        // })
        //
        // mutation.output.forEach((box : Box) => {
        //     let refsOutput      = this.mutationReferencingOutput.get(box.id)
        //
        //     if (!refsOutput) {
        //         refsOutput      = new Set<ChronoMutationBox>()
        //
        //         this.mutationReferencingOutput.set(box.id, refsOutput)
        //     }
        //
        //     refsOutput.add(mutation)
        // })
    }


    addNode (box : Box) : Box {
        if (this.hasBox(box.id)) return box

        super.addNode(box)

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
        const candidate     = this.getCandidate()

        if (!candidate.hasDirectNode(node)) candidate.addNode(node)
    }


    propagate () {
        const me        = this
        const candidate = this.getCandidate()

        const topoBox   = []

        this.walkDepth(WalkForwardContext.new({
            forEachNext             : function (box : Box, func) {
                if (box === <any>me) {
                    candidate.nodes.forEach((node : ChronoGraphNode) => {
                        func(me.getBox(node.id))
                    })
                } else
                    WalkForwardContext.prototype.forEachNext.call(this, box, func)
            },

            onNode                  : (node : ChronoGraphNode) => {
                // console.log(`Visiting ${node}`)
            },
            onCycle                 : () => { throw new Error("Cycle in graph") },

            onTopologicalNode       : (box : Box) => {
                if (<any>box !== <any>this && !(box instanceof MinimalChronoMutationBox)) topoBox.push(box)
            }
        }))

        for (var i = topoBox.length - 1; i >= 0; i--) {
            const box                   = topoBox[ i ]

            // const computedAsResultOf    = this.mutationReferencingOutput.get(box.id)

            const computedAsResultOf    = box.incoming as Set<ChronoMutationBox>

            if (computedAsResultOf) {
                const computedAsResultOfArr     = Array.from(computedAsResultOf)

                if (computedAsResultOfArr.length > 1) throw new Error("Implement mutations combination")

                if (computedAsResultOfArr.length === 1) {
                    const mutationBox       = computedAsResultOfArr[ 0 ]

                    const resultNodes       = mutationBox.calculate()

                    resultNodes.forEach(resultNode => {
                        if (!candidate.hasDirectNode(resultNode)) candidate.addNode(resultNode)
                    })
                }
            }
        }


        this.commit()
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

        // this.walkDepth(WalkBackwardContext.new({
        //     // getNext                 : () => {
        //     //
        //     // },
        //
        //     onNode                  : (node : ChronoGraphNode) => null,//console.log(`Visiting node ${node.id}, version : ${node.version}`),
        //     onCycle                 : () => { throw new Error("Cycle in graph") },
        //
        //     onTopologicalNode       : (node : ChronoGraphNode) => {
        //         if (<any>node === <any>this) return
        //
        //         // console.log(`Visiting TOPO [${node}]`)
        //
        //         if (node instanceof MinimalChronoMutationNode) {
        //
        //             let someIsDirty     = false
        //
        //             node.mapInput(node.input, (box : Box) => {
        //                 if (this.hasDirectNode(box.value)) someIsDirty = true
        //             })
        //
        //             if (someIsDirty) {
        //                 const resultNodes   = node.calculate() as ChronoGraphNode[]
        //
        //                 resultNodes.forEach((resultNode, index) => {
        //                     // if the new atom has been created for the output, add it to graph
        //                     // if (resultNode !== node.output[ index ])
        //
        //                     if (!this.hasDirectNode(resultNode)) this.addNode(resultNode)
        //                 })
        //             }
        //         }
        //     }
        // }))
    }

}

export type GraphSnapshot               = Mixin<typeof GraphSnapshot>
export type GraphSnapshotConstructor    = MixinConstructor<typeof GraphSnapshot>

export const MinimalGraphSnapshot       = GraphSnapshot(Graph(WalkableForward(WalkableBackward(Walkable(MinimalImmutable)))))
export type MinimalGraphSnapshot        = InstanceType<typeof MinimalGraphSnapshot>
