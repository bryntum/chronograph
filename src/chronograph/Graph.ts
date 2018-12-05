import {Atom, MinimalRWAtom, Readable, Writable} from "../chrono/Atom.js";
import {chronoId, ChronoId} from "../chrono/Id.js";
import {ChronoCalculation} from "./Mutation.js";
import {Base, Constructable, Mixin, MixinConstructor} from "../class/Mixin.js";
import {Graph} from "../graph/Graph.js";
import {Node, ObservedBy, Observer} from "../graph/Node.js";
import {ChronoGraphNode, ChronoMutationNode, HasId, MinimalChronoMutationNode, Reference, VersionedNode, VersionedReference} from "./Node.js";


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


        getToEdges(): Set<this> {
            const implicitEdgesFromMutations        = new Set<this>(<any>[ ...this.mutations ])

            return new Set([ ...super.getToEdges(), ...implicitEdgesFromMutations ])
        }


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
            const candidate     = this.getCandidate()

            candidate.mutations.push(mutation)

            mutation.joinGraph(candidate)
        }


        propagate () : this {
            const candidate         = this.getCandidate()

            // const topo

            candidate.walkDepth({
                direction               : 'backward',

                onNode                  : (node : ChronoGraphNode) => null,//console.log(`Visiting node ${node.id}, version : ${node.version}`),
                onCycle                 : () => { throw new Error("Cycle in graph") },

                onTopologicalNode       : (node : ChronoGraphNode) => {
                    console.log(`Visiting TOPO [${node}]`)

                    if (node instanceof MinimalChronoMutationNode) {
                        const newLayerAtoms     = node.calculate()

                        // candidate.addNodes(newLayerAtoms)
                    }
                }
            })

            this.commit()

            return this
        }


        commit () {
            const candidate         = this.getCandidate()

            if (candidate.getNodes().size > 0) {
                this.candidate      = null

                MinimalRWAtom.prototype.set.call(this, candidate)
            }

            return this
        }


        reject () {
            this.candidate          = null
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
