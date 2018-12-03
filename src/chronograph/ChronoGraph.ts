import {Observable} from "./ChronoAtom.js";
import {Base, Constructable, Mixin} from "../class/Mixin.js";
import {Graph} from "../graph/Graph.js";
import {Node, ObservedBy, Observer} from "../graph/Node.js";
import {Calculable, ChronoAtom, Readable, Writable} from "../chrono/ChronoAtom.js";
import {chronoId, ChronoId} from "../chrono/ChronoId.js";
import {ChronoMutationNode} from "../chrono/ChronoMutation.js";


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

export const ChronoGraphNode = <T extends Constructable<Observable & Node>>(base : T) => {

    abstract class ChronoGraphNode extends base {
        id                  : ChronoId = chronoId()

        // this reference may introduce additional workload for garbage collector
        // figure out if it can be removed (in this case, the node has access to the graph only
        // inside the `joinGraph` and `unjoinGraph` methods, which should be enough
        graph               : ChronoGraphNode


        joinGraph (graph : this['graph']) {
            if (this.graph) {
                this.unjoinGraph()
            }

            this.graph  = graph
        }


        unjoinGraph () {
            delete this.graph
        }
    }

    return ChronoGraphNode
}

export type ChronoGraphNode = Mixin<typeof ChronoGraphNode>


// ChronoGraphNode with minimal dependencies, for type-checking purposes only
export class MinimalChronoGraphNode extends ChronoGraphNode(
    Node(Observable(Observer(ObservedBy(Calculable(Readable(Writable((ChronoAtom(Base)))))))))
) {
    runCalculation () {}
}



export const ChronoGraphSnapshot = <T extends Constructable<Graph & ChronoGraphNode>>(base : T) => {

    abstract class ChronoGraphSnapshot extends base {

        addNode (node : this) {
            if (node.graph.id > this.id) throw new Error("Can not reference future nodes, cyclic calculation?")

            super.addNode(node)

            node.joinGraph(this)
        }

        removeNode (node : this) {
            node.unjoinGraph()

            super.removeNode(node)
        }
    }

    return ChronoGraphSnapshot
}

export type ChronoGraphSnapshot = Mixin<typeof ChronoGraphSnapshot>



export const CalculableGraphSnapshot = <T extends Constructable<ChronoGraphSnapshot & Calculable>>(base : T) => {

    abstract class CalculableGraphSnapshot extends base {
        graph               : ChronoGraphNode & Calculable

        runCalculation () {
            this.graph && this.graph.runCalculation()
        }
    }

    return CalculableGraphSnapshot
}

export type CalculableGraphSnapshot = Mixin<typeof CalculableGraphSnapshot>



export const SynchronousGraphRunCore = <T extends Constructable<CalculableGraphSnapshot>>(base : T) =>

class SynchronousGraphRunCore extends base {

    mutationsToRun          : ChronoMutationNode[]


    getFromEdges () : Set<this> {
        const implicitEdgesfromItselfToMutations     = new Set<this>(<any>[ ...this.mutationsToRun ])

        return new Set([ ...super.getFromEdges(), ...implicitEdgesfromItselfToMutations ])
    }


    runMutation (mutation : ChronoMutationNode) {
        let newSnapshot = this.class().new()

        this.walkDepth({
            direction           : 'forward',
            onTopologicalNode   : (node : ChronoMutationNode) => {
                // const mutationNode : this     = node.constructor.new({
                //
                // })

                // newSnapshot.addNode(mutationNode)
                //
                // mutationNode.runCalculation()
            },
            onNode              : () => null,
            onCycle             : () => null
        })
    }
}

export type SynchronousGraphRunCore = Mixin<typeof SynchronousGraphRunCore>




export const AsynchronousGraphRunCore = <T extends Constructable<CalculableGraphSnapshot>>(base : T) =>

class AsynchronousGraphRunCore extends base {

    runCalculation () : Promise<any> {
        return
    }
}

export type AsynchronousGraphRunCore = Mixin<typeof AsynchronousGraphRunCore>



