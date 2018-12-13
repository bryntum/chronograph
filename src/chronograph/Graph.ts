import {ChronoValue} from "../chrono/Atom.js";
import {ChronoId} from "../chrono/Id.js";
import {Immutable, MinimalImmutable, MutableBoxWithCandidate} from "../chrono/Immutable.js";
import {MinimalMutableBox} from "../chrono/MutableBox.js";
import {ObservableRead, ObservableWrite} from "../chrono/Observation.js";
import {AnyFunction1, Constructable, Mixin, MixinConstructor} from "../class/Mixin.js";
import {Graph} from "../graph/Graph.js";
import {Walkable, WalkableBackward, WalkableForward, WalkForwardContext} from "../graph/Walkable.js";
import {Box, MinimalBox} from "./Box.js";
import {HasId} from "./HasId.js";
import {ChronoBehavior, ChronoMutationBox, MinimalChronoBehavior, MinimalChronoMutationBox} from "./Mutation.js";
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

    behaviors       : Map<ChronoBehavior, ChronoMutationBox[]>    = new Map()


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


    addBehavior (behavior : ChronoBehavior) {
        // already have this behavior
        if (this.behaviors.get(behavior)) return

        this.behaviors.set(behavior, undefined)

        behavior.addEdges()
    }


    addMutation (mutation : ChronoMutationBox) {
        // TODO possibly we don't need `this.mutations` collection at all
        this.mutations.add(mutation)

        mutation.addEdges()

        mutation.output.forEach((box : Box) => {
            if (!this.getCandidate().hasDirectNode(box.value)) {
                box.bump()

                this.addCandidateNode(box.value)
            }
        })
    }


    removeMutation (mutation : ChronoMutationBox) {
        // TODO possibly we don't need `this.mutations` collection at all
        this.mutations.delete(mutation)

        mutation.removeEdges()

        mutation.output.forEach((box : Box) => {
            if (!this.getCandidate().hasDirectNode(box.value)) {
                box.bump()

                this.addCandidateNode(box.value)
            }
        })
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


    getBox (id? : ChronoId) : Box {
        if (id !== undefined) {
            const box       = this.getNodeById(id)

            if (box) return box

            return this.addBox(MinimalBox.new({ id : id }))
        } else {
            return this.addBox(MinimalBox.new())
        }
    }


    addCandidateNode (node : ChronoGraphNode) {
        const candidate     = this.getCandidate()

        if (!candidate.hasDirectNode(node)) candidate.addNode(node)
    }


    updateBehavior (behavior : ChronoBehavior) {
        const prevMutations     = this.behaviors.get(behavior)

        prevMutations && prevMutations.forEach(mutation => this.removeMutation(mutation))

        const resultMutations   = behavior.calculate()

        this.behaviors.set(behavior, resultMutations)

        resultMutations.forEach(mutation => this.addMutation(mutation))
    }


    recomputeBehavior () {
        const me        = this
        const candidate = this.getCandidate()

        const topoBox   = []

        const potentiallyChangedBehaviors : Set<ChronoBehavior>     = new Set()

        candidate.nodes.forEach((node : ChronoGraphNode) => {
            const box       = me.getBox(node.id)

            box.toBehavior.forEach(behavior => potentiallyChangedBehaviors.add(behavior))
        })

        potentiallyChangedBehaviors.forEach(behavior => this.updateBehavior(behavior))
    }


    propagate () {
        const me        = this
        const candidate = this.getCandidate()

        this.recomputeBehavior()

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

        // should instead to "walk" forward from the visited nodes, in topo order
        // with dynamic `outgoing` edges calculation (depending from the result of the mutation)

        for (var i = topoBox.length - 1; i >= 0; i--) {
            const box                   = topoBox[ i ]

            // const computedAsResultOf    = this.mutationReferencingOutput.get(box.id)

            const computedAsResultOf    = box.incoming as Set<ChronoMutationBox>

            if (computedAsResultOf) {
                const computedAsResultOfArr = Array.from(computedAsResultOf)

                if (computedAsResultOfArr.length > 1) throw new Error("Implement mutations combination")

                if (computedAsResultOfArr.length === 1) {
                    const mutationBox       = computedAsResultOfArr[ 0 ]

                    if (mutationBox.needsRecalculation(candidate)) {
                        const resultNodes       = mutationBox.calculate()

                        resultNodes.forEach(resultNode => {
                            if (!candidate.hasDirectNode(resultNode)) candidate.addNode(resultNode)
                        })
                    }
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
