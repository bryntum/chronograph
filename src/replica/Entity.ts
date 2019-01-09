import {ChronoGraph} from "../chrono/Graph.js";
import {chronoId, ChronoId} from "../chrono/Id.js";
import {AnyConstructor1, Base, Constructable, Mixin} from "../class/Mixin.js";
import {Entity as EntityData, Field, Name, ReferenceField, ReferenceStorageField} from "../schema/Schema.js";
import {MinimalEntityAtom, MinimalFieldAtom} from "./Atom.js";


//---------------------------------------------------------------------------------------------------------------------
export const EntityAny = <T extends Constructable<object>>(base : T) => {

    class EntityAny extends base {
        $entity         : EntityData

        $calculations   : { [s in keyof this] : string }

        // TODO figure out how to filter fields only (see OnlyPropertiesOfType)
        $fields         : { [s in keyof this] : MinimalFieldAtom }

        selfAtom        : MinimalEntityAtom

        internalId      : ChronoId      = chronoId()


        initAtoms () {
            const entity    = this.$entity

            this.selfAtom   = MinimalEntityAtom.new({ entity : entity, value : this, self : this })

            const fields    = {}

            entity.fields.forEach((field : Field, name : Name) => {

                const fieldAtom = fields[ name ] = field.atomCls.new({
                    id          : `${this.internalId}/${name}`,

                    field       : field,

                    self        : this,

                    value       : this[ name ],

                    calculationContext  : this,
                    calculation         : this.$calculations ? this[ this.$calculations[ name ] ] : undefined
                })

                // TODO move getters/setters to the prototype, inside the decorator
                Object.defineProperty(this, name, {
                    get     : ()        => fieldAtom.get(),
                    set     : (value)   => fieldAtom.set(value)
                })
            })

            this.$fields     = <any>fields
        }


        getGraph () : ChronoGraph {
            return this.selfAtom.graph as ChronoGraph
        }


        forEachField (func : (field : MinimalFieldAtom, name : Name) => any) {
            const fields        = this.$fields

            for (let name in fields) {
                func.call(this, fields[ name ], name)
            }
        }


        enterGraph (graph : ChronoGraph) {
            this.forEachField(field => graph.addNode(field))

            graph.addNode(this.selfAtom)
        }


        leaveGraph () {
            const graph     = this.selfAtom.graph as ChronoGraph

            if (graph) {
                this.forEachField(field => graph.removeNode(field))

                graph.removeNode(this.selfAtom)
            }
        }


        // static addPrimaryKey (key : PrimaryKey) {
        //     return this.getEntity().addPrimaryKey(key)
        // }
        //
        //
        // static addForeignKey (key : ForeignKey) {
        //     return this.getEntity().addForeignKey(key)
        // }


        static getField (name : Name) : Field {
            return this.getEntity().getField(name)
        }


        static getEntity () : EntityData {
            return this.prototype.$entity
        }

    }

    return EntityAny
}

export type EntityAny = Mixin<typeof EntityAny>


//---------------------------------------------------------------------------------------------------------------------
export const EntityBase = <T extends Constructable<EntityAny & Base>>(base : T) =>

class EntityBase extends base {

    initialize (...args) {
        this.initAtoms()

        super.initialize(...args)
    }
}

export type EntityBase = Mixin<typeof EntityBase>


//---------------------------------------------------------------------------------------------------------------------
// `target` will be a prototype of the class with Entity mixin
export const field : PropertyDecorator = function (target : EntityAny, propertyKey : string) : void {
    let entity      = target.$entity

    if (!entity) entity = target.$entity = EntityData.new()

    entity.createField(propertyKey)
}


export const property = field


//---------------------------------------------------------------------------------------------------------------------
// `target` will be a prototype of the class with Entity mixin
export const storage : PropertyDecorator = function (target : EntityAny, propertyKey : string) : void {
    let entity      = target.$entity

    if (!entity) entity = target.$entity = EntityData.new()

    entity.addField(ReferenceStorageField.new({
        name            : propertyKey
    }))
}


//---------------------------------------------------------------------------------------------------------------------
export const calculate = function (fieldName : Name) : MethodDecorator {

    // `target` will be a prototype of the class with Entity mixin
    return function (target : EntityAny, propertyKey : string, descriptor : TypedPropertyDescriptor<any>) : void {
        let calculations        = target.$calculations

        if (!calculations) calculations = target.$calculations = <any>{}

        calculations[ fieldName ]       = propertyKey
    }
}


//---------------------------------------------------------------------------------------------------------------------
export const reference = function (entity : AnyConstructor1<EntityAny>, storageKey : string) : PropertyDecorator {

    return function (target : EntityAny, propertyKey : string) : void {
        let entity      = target.$entity

        if (!entity) entity = target.$entity = EntityData.new()

        entity.addField(ReferenceField.new({
            name            : propertyKey,
            storageKey      : storageKey
        }))
    }
}
