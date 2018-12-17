import {GraphBox} from "../chronograph/Graph.js";
import {ChronoBehavior} from "../chronograph/Mutation.js";
import {Base, Constructable, Mixin} from "../class/Mixin.js";
import {Entity as EntityData, Field, ForeignKey, Name, PrimaryKey} from "../schema/Schema.js";
import {EntityBox, FieldBox} from "./FieldBox.js";


//---------------------------------------------------------------------------------------------------------------------
export const Entity = <T extends Constructable<Base>>(base : T) => {


    class Entity extends base {
        $entity         : EntityData

        // TODO figure out how to filter fields only
        fields          : { [s in keyof this] : FieldBox }

        selfBox         : EntityBox


        initialize (...args) {
            const fields    = {}

            this.$entity.fields.forEach((field, name) => {
                const fieldBox = fields[ name ] = FieldBox.new({ field : field, self : this })

                Object.defineProperty(this, name, {
                    get     : ()        => fieldBox.get(),
                    set     : (value)   => fieldBox.set(value)
                })
            })

            this.fields     = <any>fields

            this.selfBox    = EntityBox.new({ entity : this.$entity, self : this })

            super.initialize(...args)
        }


        forEachField (func : (field : FieldBox, name : Name) => any) {
            const fields        = this.fields

            for (let name in fields) {
                func.call(this, fields[ name ], name)
            }
        }


        joinGraph (graph : GraphBox) {
            this.forEachField(field => field.joinGraph(graph))

            this.selfBox.joinGraph(graph)

            this.computeBehavior().forEach(behavior => graph.addBehavior(behavior))
        }


        computeBehavior () : ChronoBehavior[] {
            return []
        }


        unjoinGraph () {
            if (this.selfBox.graph) {
                this.forEachField(field => field.unjoinGraph())

                this.selfBox.unjoinGraph()
            }
        }


        static addPrimaryKey (key : PrimaryKey) {
            return this.getEntity().addPrimaryKey(key)
        }


        static addForeignKey (key : ForeignKey) {
            return this.getEntity().addForeignKey(key)
        }


        static getField (name : Name) : Field {
            return this.getEntity().getField(name)
        }


        static getEntity () : EntityData {
            return this.prototype.$entity
        }

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
