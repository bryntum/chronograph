import {Base, Constructable, Mixin} from "../class/Mixin.js";
import {Entity as EntityData} from "../schema/Schema.js";
import {FieldBox} from "./FieldBox.js";


//---------------------------------------------------------------------------------------------------------------------
export const Entity = <T extends Constructable<Base>>(base : T) => {


    class Entity extends base {
        $entity         : EntityData

        // TODO figure out how to filter fields only
        fields          : { [s in keyof this] : FieldBox }


        initialize (...args) {
            const fields : { [s in keyof this] : FieldBox } = <any>{}

            this.$entity.fields.forEach((field, name) => {
                fields[ name ]      = FieldBox.new({
                    field       : field,
                    self        : this
                })
            })

            this.fields = fields

            super.initialize(...args)
        }


        // joinGraph (graph : ChronoGraphNode) {
        //     super.joinGraph(graph)
        //
        //     const fields        = this.fields
        //
        //     for (let key in fields) {
        //         fields[ key ].joinGraph(graph)
        //     }
        // }
        //
        //
        // unjoinGraph () {
        //     if (this.graph) {
        //         const fields        = this.fields
        //
        //         for (let key in fields) {
        //             fields[ key ].unjoinGraph()
        //         }
        //     }
        //
        //     super.unjoinGraph()
        // }
    }

    return Entity
}

export type Entity = Mixin<typeof Entity>


// export function entity (schema : Schema) : ClassDecorator {
//     return (target : AnyConstructor) => {
//         debugger
//
//         return target
//     }
// }
//
//
// export const field : PropertyDecorator = function (target : Object, propertyKey : string | symbol) : void {
// }
