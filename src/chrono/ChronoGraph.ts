import {Base, Constructable, Mixin} from "../class/Mixin.js";
import {Graph, GraphNode} from "../graph/Graph.js";
import {Calculable, ChronoAtom, Observable, Readable, Writable} from "./ChronoAtom.js";
import {chronoId, ChronoId} from "./ChronoId.js";
import {GenericChronoMutationNode} from "./ChronoMutation.js";


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

export const ChronoGraphNode = <T extends Constructable<ChronoAtom & Observable & GraphNode>>(base : T) => {

    abstract class ChronoGraphNode extends base {
        id                  : ChronoId = chronoId()

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
export class GenericChronoGraphNode extends ChronoGraphNode(GraphNode(Observable(Calculable(Readable(Writable((ChronoAtom(Base)))))))) {

}


export const ChronoGraphSnapshot = <T extends Constructable<Graph & ChronoGraphNode>>(base : T) => {

    abstract class ChronoGraphSnapshot extends base {

        addNode (node : ChronoGraphNode) {
            if (node.graph.id > this.id) throw new Error("Can not reference future nodes, cyclic calculation?")

            super.addNode(node)
        }
    }

    return ChronoGraphSnapshot
}

// @ ts-ignore - silence cyclic type references
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



export const SynchronousGraphRunCore = <T extends Constructable<GraphNode & CalculableGraphSnapshot>>(base : T) =>

class SynchronousGraphRunCore extends base {


    getFromEdges () : Set<this> {
        const implicitEdgesfromItselfToAllNodes     = new Set<this>(<any>[ ...this.nodes ])

        return new Set([ ...super.getFromEdges(), ...implicitEdgesfromItselfToAllNodes ])
    }


    runCalculation () {

        let newSnapshot : this        //= //this.constructor.new()

        this.walkDepth({
            direction           : 'forward',
            onTopologicalNode   : () => {
                const mutationNode      = GenericChronoMutationNode.new({

                })

                newSnapshot.addNode(mutationNode)

                mutationNode.runCalculation()
            }
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



