import {AnyConstructor1, Base, Constructable, Mixin, MixinConstructor} from "../class/Mixin.js";
import {Graph} from "../graph/Graph.js";
import {WalkableBackwardNode, WalkableForwardNode} from "../graph/Node.js";
import {Walkable, WalkableBackward, WalkableForward, WalkForwardContext} from "../graph/Walkable.js";
import {ChronoAtom, MinimalChronoAtom} from "./Atom.js";
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

    // it seems currently we rely on the Set's `forEach` method to preserve the order of elements addition
    // see "020_performance" test - initial "graph.propagate()"
    // need to at least code this explicitly
    changedAtoms        : Set<ChronoAtom>       = new Set()
    dirtyAtoms          : Set<ChronoAtom>       = new Set()



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
        return this.changedAtoms.size > 0
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


    getOrCreateAtom (id : ChronoId, cls : MixinConstructor<typeof ChronoAtom> = MinimalChronoAtom) : this[ 'nodeT' ] {
        const existing      = this.nodesMap.get(id)

        if (existing) return existing

        return this.addNode(cls.new({ id : id }))
    }


    createAtom () {
        return this.addNode(MinimalChronoAtom.new())
    }


    needRecalculation (atom : ChronoAtom) : boolean {
        if (this.dirtyAtoms.has(atom)) return true

        for (let inputAtom of atom.incoming as Set<ChronoAtom>) {
            if (inputAtom.isDirty()) return true
        }

        return false
    }


    propagate () {
        const me        = this

        const topoOrder : ChronoAtom[] = []

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

            if (this.needRecalculation(atom)) {
                atom.set(atom.calculate(atom.nextValue))
            }
        }

        this.commit()
    }


    addNode (node : this[ 'nodeT' ]) : this[ 'nodeT' ] {
        const res   = super.addNode(node)

        this.nodesMap.set(node.id, node)

        if (!node.hasValue()) this.markDirty(node)

        node.onEnterGraph(this)

        return res
    }


    removeNode (node : this[ 'nodeT' ]) {
        const res   = super.removeNode(node)

        this.nodesMap.delete(node.id)

        node.onLeaveGraph(this)

        return res
    }


}

export type ChronoGraph = Mixin<typeof ChronoGraph>

export const MinimalChronoGraph = ChronoGraph(Graph(WalkableForwardNode(WalkableBackwardNode(WalkableForward(WalkableBackward(Walkable(Base)))))))
export type MinimalChronoGraph  = InstanceType<typeof MinimalChronoGraph>
