import {ChronoGraphNode} from "../chronograph/Node.js";
import {Constructable, Mixin} from "../class/Mixin.js";
import {FieldBox} from "./FieldBox.js";
import {Entity} from "./Schema.js";


//---------------------------------------------------------------------------------------------------------------------
export const ChronoObject = <T extends Constructable<any>>(base : T) => {

    abstract class ChronoObject extends base {
        meta            : Entity

        // TODO figure out how to filter fields only
        fields          : { [s in keyof this] : FieldBox }


        initialize (...args) {
            // this.fields     = this.meta.generateNodes(this, MinimalChronoGraphNode) as any

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



export const field          = (...args) : any => {}
