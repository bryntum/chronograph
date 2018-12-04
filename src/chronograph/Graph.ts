import {Atom, MinimalRWAtom, Readable, Writable} from "../chrono/Atom.js";
import {chronoId, ChronoId} from "../chrono/ChronoId.js";
import {ChronoCalculation} from "../chrono/Mutation.js";
import {Base, Constructable, Mixin, MixinConstructor} from "../class/Mixin.js";
import {Graph} from "../graph/Graph.js";
import {Node, ObservedBy, Observer} from "../graph/Node.js";
import {ChronoGraphNode, ChronoMutationNode, HasId, Reference, VersionedNode, VersionedReference} from "./Node.js";


//
// TODO BIG THING POTENTIALLY
// ==========================
//
// all chrono graph nodes are current read/write by default (on type level), to enforce the distinction
// we need some type magic, to write a class like
//
//     class Some {
//
//         someField   : Field<Date, Readable, Writable>
//
//         fields  : { me : ChronoAtom<Date, Readable, Writable> }
//
//
//         someMethod : {
//
//             this.someField.getTime()
//         }
//     }
// this can quickly go wild, need to consult TS devs

export type ChronoGraphSnapshotConstructor  = MixinConstructor<typeof ChronoGraphSnapshot>

export const ChronoGraphSnapshot = <T extends Constructable<Graph & ChronoGraphNode>>(base : T) => {

    abstract class ChronoGraphSnapshot extends base {

        mutations       : ChronoMutationNode[]     = []

        candidate       : this


        getNextVersion () : ChronoId {
            return this.getCandidate().version
        }


        getCandidate () : this {
            return this.candidate || (this.candidate = this.bump())
        }


        addNode (node : ChronoGraphNode) : ChronoGraphNode {
            // if (node.graph.id > this.id) throw new Error("Can not reference future nodes, cyclic calculation?")

            const res = super.addNode(node)

            node.joinGraph(this)

            return <any>res
        }

        removeNode (node : ChronoGraphNode) {
            node.unjoinGraph()

            super.removeNode(node)
        }


        addMutation (mutation : ChronoMutationNode) {
            this.getCandidate().mutations.push(mutation)
        }


        propagate () : this {
            const candidate         = this.getCandidate()

            candidate.mutations.forEach(mutation => {
                const newLayerAtoms     = mutation.runCalculation()

                candidate.addNodes(newLayerAtoms)
            })

            if (candidate.getNodes().size > 0) {
                this.candidate      = null

                MinimalRWAtom.prototype.set.call(this, candidate)
            }

            return this
        }


        bump () : this {
            const cls       = <ChronoGraphSnapshotConstructor>(this.constructor as any)

            return cls.new({
                id              : this.id,
                previous        : this
            }) as this
        }

    }

    return ChronoGraphSnapshot
}

export type ChronoGraphSnapshot = Mixin<typeof ChronoGraphSnapshot>


export const MinimalChronoGraphSnapshot = ChronoGraphSnapshot(ChronoGraphNode(Graph(VersionedReference(Reference(VersionedNode(HasId(Node(Observer(ObservedBy(Writable(Readable(Atom(Base)))))))))))))


// export const CalculableGraphSnapshot = <T extends Constructable<ChronoGraphSnapshot & Calculable>>(base : T) => {
//
//     abstract class CalculableGraphSnapshot extends base {
//         graph               : ChronoGraphNode & Calculable
//
//         runCalculation () {
//             this.graph && this.graph.runCalculation()
//         }
//     }
//
//     return CalculableGraphSnapshot
// }
//
// export type CalculableGraphSnapshot = Mixin<typeof CalculableGraphSnapshot>
//
//
//
// export const SynchronousGraphRunCore = <T extends Constructable<CalculableGraphSnapshot>>(base : T) =>
//
// class SynchronousGraphRunCore extends base {
//
//     mutationsToRun          : ChronoMutationNode[]
//
//
//     getFromEdges () : Set<this> {
//         const implicitEdgesfromItselfToMutations     = new Set<this>(<any>[ ...this.mutationsToRun ])
//
//         return new Set([ ...super.getFromEdges(), ...implicitEdgesfromItselfToMutations ])
//     }
//
//
//     runMutation (mutation : ChronoMutationNode) {
//         let newSnapshot = this.class().new()
//
//         this.walkDepth({
//             direction           : 'forward',
//             onTopologicalNode   : (node : Node) => {
//                 // const mutationNode : this     = node.constructor.new({
//                 //
//                 // })
//
//                 // newSnapshot.addNode(mutationNode)
//                 //
//                 // mutationNode.runCalculation()
//             },
//             onNode              : () => null,
//             onCycle             : () => null
//         })
//     }
// }
//
// export type SynchronousGraphRunCore = Mixin<typeof SynchronousGraphRunCore>
//
//
//
//
// export const AsynchronousGraphRunCore = <T extends Constructable<CalculableGraphSnapshot>>(base : T) =>
//
// class AsynchronousGraphRunCore extends base {
//
//     runCalculation () : Promise<any> {
//         return
//     }
// }
//
// export type AsynchronousGraphRunCore = Mixin<typeof AsynchronousGraphRunCore>
//
//
//
