import {ChronoGraphLayer, ChronoGraphNode, GenericChronoGraphNode} from "../chrono/ChronoGraph.js";
import {Base, Constructable, Mixin} from "../util/Mixin.js";
import {Entity} from "./Schema.js";

// Possibly split to ChronoObject (just has fields) + ChronoGraphObject (fields are graph nodes)
export const ChronoObject = <T extends Constructable<Base & ChronoGraphNode>>(base : T) => {

    abstract class ChronoObject extends base {
        meta            : Entity

        // TODO figure out how to filter fields only
        fields          : { [s in keyof this] : ChronoGraphNode }

        graph           : ChronoGraphLayer


        initialize (...args) {
            this.fields     = this.meta.generateNodes(this, GenericChronoGraphNode) as any

            super.initialize(...args)
        }


        joinGraph (graph : ChronoGraphLayer) {
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

