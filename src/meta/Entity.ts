import {ChronoGraphNode} from "../chronograph/Node.js";
import {AnyConstructor, Constructable, Mixin} from "../class/Mixin.js";
import {Entity as EntityData, Schema} from "../schema/Schema.js";
import {FieldBox} from "./FieldBox.js";


//---------------------------------------------------------------------------------------------------------------------
export const Entity = <T extends Constructable<any>>(base : T = <any>Object) => {


    class Entity extends base {
        // meta            : EntityData
        //
        // // TODO figure out how to filter fields only
        // fields          : { [s in keyof this] : FieldBox }
        //
        //
        // initialize (...args) {
        //     // this.fields     = this.meta.generateNodes(this, MinimalChronoGraphNode) as any
        //
        //     super.initialize(...args)
        // }
        //
        //
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
