import {ChronoAtom, ChronoValue, identity} from "../chrono/Atom.js";
import {ChronoGraph} from "../chrono/Graph.js";
import {chronoId, ChronoId} from "../chrono/Id.js";
import {AnyConstructor1, Base, Constructable, Mixin} from "../class/Mixin.js";
import {Entity as EntityData, Field, Name, ReferenceField, ReferenceStorageField} from "../schema/Schema.js";
import {FieldAtom, MinimalEntityAtom, MinimalFieldAtom} from "./Atom.js";


//---------------------------------------------------------------------------------------------------------------------
export const EntityAny = <T extends Constructable<object>>(base : T) => {

    class EntityAny extends base {
        $entity         : EntityData

        $calculations   : { [s in keyof this] : string }

        // TODO figure out how to filter fields only (see OnlyPropertiesOfType)
        $               : { [s in keyof this] : MinimalFieldAtom }

        $$              : MinimalEntityAtom

        $internalId     : ChronoId


        initAtoms (config) {
            // TODO move to property initializers
            if (this.$internalId == null) this.$internalId = chronoId()

            const entity        = this.$entity

            this.$$             = MinimalEntityAtom.new({ id : this.$internalId, entity : entity, value : this, self : this })

            if (!this.$) this.$ = <any>{}

            const fields        = this.$

            entity.fields.forEach((field : Field, name : Name) => {
                if (fields[ name ]) {
                    // DIRTY HACK
                    if (config && config.hasOwnProperty(name)) {
                        fields[ name ].writeValue(config[ name ])
                    }
                    return
                }

                const calculationFunction   = this.$calculations && this[ this.$calculations[ name ] ]

                const fieldAtom = fields[ name ] = field.atomCls.new({
                    id          : `${this.$internalId}/${name}`,

                    field       : field,

                    self        : this,

                    shouldCommitValue   : !field.continued,

                    // value               : config && config.hasOwnProperty(name) ? config[ name ] : this[ name ],

                    calculationContext  : calculationFunction ? this : undefined,
                    calculation         : calculationFunction || identity,

                    // setterPropagation   : field.atomSetterPropagation
                })

                if (config.hasOwnProperty(name)) {
                    fieldAtom.writeValue(config[name])
                }
                else if (this[ name ] !== undefined) {
                    fieldAtom.writeValue(this[ name ])
                }
            })
        }


        // the actually returned type is `FieldAtom`, but this does not typecheck - circularity
        createFieldAtom (name : Name) : ChronoAtom {
            // TODO move to property initializers
            if (this.$internalId == null) this.$internalId = chronoId()

            const field     = this.$entity.getField(name)

            const calculationFunction   = this.$calculations && this[ this.$calculations[ name ] ]

            return field.atomCls.new({
                id          : `${this.$internalId}/${name}`,

                field       : field,

                self        : this,

                shouldCommitValue   : !field.continued,

                calculationContext  : calculationFunction ? this : undefined,
                calculation         : calculationFunction || identity,

                // setterPropagation   : field.atomSetterPropagation
            })
        }


        getGraph () : ChronoGraph {
            return this.$$.graph as ChronoGraph
        }


        forEachField (func : (field : MinimalFieldAtom, name : Name) => any) {
            const fields        = this.$

            for (let name in fields) {
                func.call(this, fields[ name ], name)
            }
        }


        enterGraph (graph : ChronoGraph) {
            this.forEachField(field => graph.addNode(field))

            graph.addNode(this.$$)
        }


        leaveGraph () {
            const graph     = this.$$.graph as ChronoGraph

            if (graph) {
                this.forEachField(field => graph.removeNode(field))

                graph.removeNode(this.$$)
            }
        }


        propagate () {
            this.getGraph().propagate()
        }


        markAsNeedRecalculation (atom : ChronoAtom) {
            this.getGraph().markAsNeedRecalculation(atom)
        }


        markStable (atom : ChronoAtom) {
            this.getGraph().markStable(atom)
        }


        isStable (atom : ChronoAtom) : boolean {
            return this.getGraph().isAtomStable(atom)
        }


        processNext (atom : ChronoAtom) {
            this.getGraph().processNext(atom)
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

    initialize (config) {
        this.initAtoms(config)

        super.initialize(config)
    }
}

export type EntityBase = Mixin<typeof EntityBase>


//---------------------------------------------------------------------------------------------------------------------
export const generalField = function (fieldCls : typeof Field, fieldConfig? : unknown) : PropertyDecorator {

    return function (target : EntityAny, propertyKey : string) : void {
        let entity      = target.$entity

        if (!entity) entity = target.$entity = EntityData.new()

        const field = entity.addField(fieldCls.new(Object.assign(fieldConfig || {}, {
            name            : propertyKey
        })));

        field.createAccessors && Object.defineProperty(target, propertyKey, {
            get     : function () {
                if (!this.$) this.$ = {}

                let field       = this.$[ propertyKey ]

                if (!field) field   = this.$[ propertyKey ] = this.createFieldAtom(propertyKey)

                return this.$[ propertyKey ].get(...arguments)
            },

            set     : function () {
                if (!this.$) this.$ = {}

                let field       = this.$[ propertyKey ]

                if (!field) field   = this.$[ propertyKey ] = this.createFieldAtom(propertyKey)

                return this.$[ propertyKey ].set(...arguments)
            }
        })
    }
}



//---------------------------------------------------------------------------------------------------------------------
// `target` will be a prototype of the class with Entity mixin
export const field : PropertyDecorator = generalField(Field)

// //---------------------------------------------------------------------------------------------------------------------
// // `target` will be a prototype of the class with Entity mixin
// export const flag : PropertyDecorator = function (target : EntityAny, propertyKey : string) : void {
//     let entity      = target.$entity
//
//     if (!entity) entity = target.$entity = EntityData.new()
//
//     entity.addField(FlagField.new({
//         name            : propertyKey
//     }))
//
//     Object.defineProperty(target, propertyKey, {
//         get     : function () {
//             if (!this.$) this.$ = {}
//
//             let field       = this.$[ propertyKey ]
//
//             if (!field) field   = this.$[ propertyKey ] = this.createFieldAtom(propertyKey)
//
//             return this.$[ propertyKey ].get(...arguments)
//         },
//
//         set     : function () {
//             if (!this.$) this.$ = {}
//
//             let field       = this.$[ propertyKey ]
//
//             if (!field) field   = this.$[ propertyKey ] = this.createFieldAtom(propertyKey)
//
//             return this.$[ propertyKey ].set(...arguments)
//         }
//     })
// }


//---------------------------------------------------------------------------------------------------------------------
// `target` will be a prototype of the class with Entity mixin
export const storage : PropertyDecorator = generalField(ReferenceStorageField)


//---------------------------------------------------------------------------------------------------------------------
export const reference = function (entity : AnyConstructor1<EntityAny>, storageKey : string) : PropertyDecorator {
    return generalField(ReferenceField, { storageKey })
}


//---------------------------------------------------------------------------------------------------------------------
export const continuationOf = function (continuationOfAtomName : string) : PropertyDecorator {

    return function (target : EntityAny, propertyKey : string) : void {
        const entity            = target.$entity
        const field             = entity.getField(propertyKey)
        const precedingField    = entity.getField(continuationOfAtomName)

        field.continuationOf        = precedingField
        precedingField.continued    = true
    }
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


// //---------------------------------------------------------------------------------------------------------------------
// export const setterPropagation = function (fieldName : Name) : MethodDecorator {
//
//     // `target` will be a prototype of the class with Entity mixin
//     return function (target : EntityAny, propertyKey : string, descriptor : TypedPropertyDescriptor<any>) : void {
//         let entity      = target.$entity
//
//         let field       = entity.getField(fieldName)
//
//         field.atomSetterPropagation     = descriptor.value
//
//         descriptor.value    = function () {
//             (this as EntityAny).$[ fieldName ].put(...arguments)
//         }
//     }
// }
