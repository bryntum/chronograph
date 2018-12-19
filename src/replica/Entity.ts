import {GraphBox} from "../chronograph/Graph.js";
import {ChronoBehavior} from "../chronograph/Mutation.js";
import {Base, Constructable, Mixin} from "../class/Mixin.js";
import {Entity as EntityData, Field, ForeignKey, Name, PrimaryKey} from "../schema/Schema.js";
import {EntityBox, FieldBox} from "./FieldBox.js";


export type OutputResolver = (entity : Entity) => FieldBox

//---------------------------------------------------------------------------------------------------------------------
export const Entity = <T extends Constructable<Base>>(base : T) => {

    class Entity extends base {
        $entity         : EntityData

        // TODO figure out how to filter fields only (see OnlyPropertiesOfType)
        fields          : { [s in keyof this] : FieldBox }

        mutationsOutputResolvers : { [s in keyof this] : OutputResolver }

        selfBox         : EntityBox

        mutate          : this


        initialize (...args) {
            const fields    = {}

            this.$entity.fields.forEach((field, name) => {
                const fieldBox = fields[ name ] = FieldBox.new({ field : field, self : this })

                const value     = this[ name ]

                Object.defineProperty(this, name, {
                    get     : ()        => fieldBox.get(),
                    set     : (value)   => fieldBox.set(value)
                })

                if (value !== undefined) fieldBox.set(value)
            })

            this.fields     = <any>fields

            this.selfBox    = EntityBox.new({ entity : this.$entity, self : this })


            this.mutate     = <any>{}

            for (let name in this.mutationsOutputResolvers) {
                this.mutate[ name ]     = <any>(() => {
                    const graph     = this.getGraph()
                    const output    = this.mutationsOutputResolvers[ name ](this)

                    return graph.compute(output, <any>this[ name ])
                })
            }



            super.initialize(...args)
        }


        getGraph () : GraphBox {
            return this.selfBox.graph as GraphBox
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


        propagate () {
            // this.selfBox.propagate()
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


//---------------------------------------------------------------------------------------------------------------------
// `target` will be a prototype of the class with Entity mixin
export const field : PropertyDecorator = function (target : Entity, propertyKey : string | symbol) : void {
    let entity      = target.$entity

    if (!entity) entity = target.$entity = EntityData.new()

    entity.createField(propertyKey)
}


export const property = field


export const mutate = function (resolver : OutputResolver) : MethodDecorator {

    // `target` will be a prototype of the class with Entity mixin
    return function (target : Entity, propertyKey : string | symbol, descriptor : TypedPropertyDescriptor<any>) : void {
        let mutations       = target.mutationsOutputResolvers

        if (!mutations) mutations = target.mutationsOutputResolvers = <any>{}

        mutations[ propertyKey ]    = resolver

        // const calculation           = target[ propertyKey ]
        //
        // target[ propertyKey ]       = function () {
        //     const graph     = this.getGraph()
        //     const output    = resolver(this)
        //
        //     return graph.compute(output, calculation)
        // }
    }
}
