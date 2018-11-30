import {ChronoGraphNode, GenericChronoGraphNode} from "../chrono/ChronoGraph.js";
import {Constructable, Mixin} from "../class/Mixin.js";
import {Entity} from "./Schema.js";

// Possibly split to ChronoObject (just has fields) + ChronoGraphObject (fields are graph nodes)
export const ChronoObject = <T extends Constructable<ChronoGraphNode>>(base : T) => {

    abstract class ChronoObject extends base {
        meta            : Entity

        // TODO figure out how to filter fields only
        fields          : { [s in keyof this] : ChronoGraphNode }


        initialize (...args) {
            this.fields     = this.meta.generateNodes(this, GenericChronoGraphNode) as any

            super.initialize(...args)
        }


        joinGraph (graph : ChronoGraphNode) {
            super.joinGraph(graph)

            const fields        = this.fields

            for (let key in fields) {
                fields[ key ].joinGraph(graph)
            }
        }


        unjoinGraph () {
            if (this.graph) {
                const fields        = this.fields

                for (let key in fields) {
                    fields[ key ].unjoinGraph()
                }
            }

            super.unjoinGraph()
        }

    }
}

export type ChronoObject = Mixin<typeof ChronoObject>

