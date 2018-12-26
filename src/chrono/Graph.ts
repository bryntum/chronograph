import {Base, Constructable, Mixin} from "../class/Mixin.js";
import {Graph} from "../graph/Graph.js";
import {WalkableBackwardNode, WalkableForwardNode} from "../graph/Node.js";
import {Walkable, WalkableBackward, WalkableForward, WalkBackwardContext, WalkForwardContext} from "../graph/Walkable.js";
import {ChronoAtom, ChronoCalculation, MinimalChronoAtom} from "./Atom.js";
import {ChronoId} from "./Id.js";


//---------------------------------------------------------------------------------------------------------------------
export type ChronoRevision      = number

//---------------------------------------------------------------------------------------------------------------------
// this interface exists only to break the cyclic dependency between Atom / Graph
export interface IChronoGraph {
    // revision            : ChronoRevision

    isObservingRead     : number
    isObservingWrite    : number

    onReadObserved (atom : ChronoAtom)
    onWriteObserved (atom : ChronoAtom)

    startReadObservation ()
    stopReadObservation () : ChronoAtom[]

    // calculateAtom (atom : ChronoAtom, proposedValue : ChronoValue)

    markDirty (atom : ChronoAtom)

    commit ()
    reject ()
    propagate ()
}


//---------------------------------------------------------------------------------------------------------------------
export const ChronoGraph = <T extends Constructable<Graph>>(base : T) =>

class ChronoGraph extends base implements IChronoGraph {
    // revision            : ChronoRevision

    isObservingRead     : number        = 0
    isObservingWrite    : number        = 0

    readObservationState : ChronoAtom[]         = []

    nodeT               : ChronoAtom

    nodesMap            : Map<ChronoId, ChronoAtom> = new Map()

    changedAtoms        : Set<ChronoAtom>       = new Set()
    dirtyAtoms          : Set<ChronoAtom>       = new Set()

    // calculationsStack   : ChronoCalculation[]   = []


    startReadObservation () {
        this.isObservingRead++
    }


    stopReadObservation () : ChronoAtom[] {
        this.isObservingRead--

        const res       = this.readObservationState

        this.readObservationState   = []

        return res
    }


    // nextRevision () {
    //     return this.revision
    // }


    onReadObserved (atom : ChronoAtom) {
        this.readObservationState.push(atom)
    }


    onWriteObserved (atom : ChronoAtom) {
    }


    isDirty () : boolean {
        return this.dirtyAtoms.size > 0
    }


    markDirty (atom : ChronoAtom) {
        this.changedAtoms.add(atom)
        this.dirtyAtoms.add(atom)
    }


    markChanged (atom : ChronoAtom) {
        this.changedAtoms.add(atom)
    }


    commit () {
        this.changedAtoms.forEach(atom => atom.commit())

        this.changedAtoms.clear()
        this.dirtyAtoms.clear()
    }

    reject () {
        this.changedAtoms.forEach(atom => atom.reject())

        this.changedAtoms.clear()
        this.dirtyAtoms.clear()
    }


    getOrCreateAtom (id : ChronoId) {
        const existing      = this.nodesMap.get(id)

        if (existing) return existing

        return this.addNode(MinimalChronoAtom.new({ id : id }))
    }


    createAtom () {
        return this.addNode(MinimalChronoAtom.new())
    }


    propagate () {
        const me        = this

        const topoOrder = []

        this.walkDepth(WalkForwardContext.new({
            forEachNext             : function (atom : ChronoAtom, func) {
                if (atom === <any>me) {
                    me.dirtyAtoms.forEach((atom : ChronoAtom) => func(atom))
                } else {
                    WalkForwardContext.prototype.forEachNext.call(this, atom, func)
                }
            },

            onNode                  : (atom : ChronoAtom) => {
                // console.log(`Visiting ${node}`)
            },
            onCycle                 : () => { throw new Error("Cycle in graph") },

            onTopologicalNode       : (atom : ChronoAtom) => {
                if (<any>atom === <any>this) return

                topoOrder.push(atom)
            }
        }))

        for (let i = topoOrder.length - 1; i >= 0; i--) {
            const atom          = topoOrder[ i ]

            atom.set(atom.calculate(atom.nextValue))
        }

        this.commit()
    }


    addNode (node : this[ 'nodeT' ]) : this[ 'nodeT' ] {
        const res   = super.addNode(node)

        node.joinGraph(this)

        this.nodesMap.set(node.id, node)

        return res
    }


    removeNode (node : this[ 'nodeT' ]) {
        const res   = super.removeNode(node)

        node.unjoinGraph(this)

        this.nodesMap.delete(node.id)

        return res
    }


}

export type ChronoGraph = Mixin<typeof ChronoGraph>

export const MinimalChronoGraph = ChronoGraph(Graph(WalkableForwardNode(WalkableBackwardNode(WalkableForward(WalkableBackward(Walkable(Base)))))))
export type MinimalChronoGraph  = InstanceType<typeof MinimalChronoGraph>
