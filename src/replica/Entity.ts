import {AsyncChronoCalculation, SyncChronoCalculation} from "../chrono/Atom.js";
import {ChronoGraph} from "../chrono/Graph.js";
import {chronoId, ChronoId} from "../chrono/Id.js";
import {AnyConstructor1, Base, Constructable, Mixin} from "../class/Mixin.js";
import {Entity as EntityData, Field, ForeignKey, Name, PrimaryKey} from "../schema/Schema.js";
import {EntityAtom, FieldAtom} from "./Atom.js";
import {ReferenceAtom, ReferenceStorageAccumulator} from "./Reference.js";



//---------------------------------------------------------------------------------------------------------------------
export const Entity = <T extends Constructable<Base>>(base : T) => {

    class Entity extends base {
        $entity         : EntityData

        $calculations   : { [s in keyof this] : SyncChronoCalculation | AsyncChronoCalculation }

        // TODO figure out how to filter fields only (see OnlyPropertiesOfType)
        fields          : { [s in keyof this] : FieldAtom }

        selfAtom        : EntityAtom

        internalId      : ChronoId      = chronoId()


        initialize (...args) {
            this.selfAtom   = EntityAtom.new({ entity : this.$entity, value : this, self : this })

            const fields    = {}

            this.$entity.fields.forEach((field, name) => {
                const fieldAtom = fields[ name ] = field.cls.new({
                    id          : `${this.internalId}/${name}`,

                    field       : field,

                    self        : this,

                    value       : this[ name ],

                    calculationContext  : this,
                    calculation         : this.$calculations ? this[ this.$calculations[ name ] ] : undefined,

                    referenceStorageAccumulator : field.referenceStorageAccumulator
                })

                Object.defineProperty(this, name, {
                    get     : ()        => fieldAtom.get(),
                    set     : (value)   => fieldAtom.set(value)
                })
            })

            this.fields     = <any>fields

            super.initialize(...args)
        }


        getGraph () : ChronoGraph {
            return this.selfAtom.graph as ChronoGraph
        }


        forEachField (func : (field : FieldAtom, name : Name) => any) {
            const fields        = this.fields

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
export const field : PropertyDecorator = function (target : Entity, propertyKey : string) : void {
    let entity      = target.$entity

    if (!entity) entity = target.$entity = EntityData.new()

    entity.createField(propertyKey)
}


export const property = field


//---------------------------------------------------------------------------------------------------------------------
// `target` will be a prototype of the class with Entity mixin
export const relation : PropertyDecorator = function (target : Entity, propertyKey : string) : void {
    let entity      = target.$entity

    if (!entity) entity = target.$entity = EntityData.new()

    entity.createField(propertyKey).cls     = ReferenceStorageAccumulator
}


//---------------------------------------------------------------------------------------------------------------------
export const calculate = function (fieldName : Name) : MethodDecorator {

    // `target` will be a prototype of the class with Entity mixin
    return function (target : Entity, propertyKey : string, descriptor : TypedPropertyDescriptor<any>) : void {
        let calculations        = target.$calculations

        if (!calculations) calculations = target.$calculations = <any>{}

        calculations[ fieldName ]       = propertyKey
    }
}


//---------------------------------------------------------------------------------------------------------------------
export const reference = function (entity : AnyConstructor1<Entity>, referenceStorageAccumulator : string) : PropertyDecorator {

    return function (target : Entity, propertyKey : string) : void {
        let entity      = target.$entity

        if (!entity) entity = target.$entity = EntityData.new()

        const field     = entity.createField(propertyKey)

        field.cls                           = ReferenceAtom
        field.referenceStorageAccumulator   = referenceStorageAccumulator
    }
}
