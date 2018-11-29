import {Graph} from "../graph/Graph.js";
import {Base, Constructable, Mixin} from "../util/Mixin.js";
import {ChronoAtom, Observable, Readable, Writable} from "./ChronoAtom.js";
import {chronoId, ChronoId} from "./ChronoId.js";


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

export const ChronoGraphNode = <T extends Constructable<ChronoAtom & Observable>>(base : T) => {

    abstract class ChronoGraphNode extends base {
        id                  : ChronoId = chronoId()

        graph               : ChronoGraphLayer


        joinGraph (graph : ChronoGraphLayer) {
            if (this.graph) {
                this.unjoinGraph()
            }

            this.graph  = graph
        }


        unjoinGraph () {
            delete this.graph
        }


        propagateChanges () {
            this.graph && this.graph.calculateNextLayer()
        }
    }

    return ChronoGraphNode
}

export type ChronoGraphNode = Mixin<typeof ChronoGraphNode>


// ChronoGraphNode with minimal dependencies, for type-checking purposes only
export const GenericChronoGraphNode     = ChronoGraphNode(Observable(Readable(Writable((ChronoAtom(Base))))))


export const ChronoGraphLayer = <T extends Constructable<Graph>>(base : T) =>

class ChronoGraphLayer extends base {

    previous            : ChronoGraphLayer

    calculateNextLayer () {

    }
}

export type ChronoGraphLayer = Mixin<typeof ChronoGraphLayer>



