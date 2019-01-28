import {ChronoAtom, ChronoValue} from "../chrono/Atom.js";
import {ChronoGraph} from "../chrono/Graph.js";
import {chronoId, ChronoId} from "../chrono/Id.js";
import { Base, Constructable, Mixin, AnyConstructor} from "../class/Mixin.js";
import {Entity as EntityData, Field, Name, ReferenceField, ReferenceStorageField} from "../schema/Schema.js";
import {MinimalEntityAtom, MinimalFieldAtom} from "./Atom.js";
import {ResolverFunc} from "./Reference.js";


//---------------------------------------------------------------------------------------------------------------------
export const EntityAny = <T extends Constructable<object>>(base : T) => {

    class EntityAny extends base {
        $entity         : EntityData

        $calculations   : { [s in keyof this] : string }


        get $() : { [s in keyof this] : MinimalFieldAtom } {
            const atomsCollection   = {}

            this.$entity.fields.forEach((field : Field, name : Name) => {
                atomsCollection[ name ] = this.createFieldAtom(name)
            })

            // @ts-ignore
            return super.$          = atomsCollection
        }


        get $$() : MinimalEntityAtom {
            // @ts-ignore
            return super.$$ = MinimalEntityAtom.new({ entity : this.$entity, value : this, self : this })
        }


        // initAtoms (config : object) {
        //     // TODO move to property initializers
        //     if (this.$internalId == null) this.$internalId = chronoId()
        //
        //     const entity        = this.$entity
        //
        //     // if (!this.$$) this.$$ = MinimalEntityAtom.new({ id : this.$internalId, entity : entity, value : this, self : this })
        //
        //     // if (!this.$) this.$ = <any>{}
        //
        //     const fields        = this.$
        //
        //     entity.fields.forEach((field : Field, name : Name) => {
        //         if (fields[ name ]) {
        //             // DIRTY HACK
        //             if (config && config.hasOwnProperty(name)) {
        //                 fields[ name ].writeValue(config[ name ])
        //             }
        //             return
        //         }
        //
        //         const calculationFunction   = this.$calculations && this[ this.$calculations[ name ] ]
        //
        //         const fieldAtom = fields[ name ] = field.atomCls.new({
        //             id          : `${this.$$.id}/${name}`,
        //
        //             field       : field,
        //
        //             self        : this,
        //
        //             shouldCommitValue   : !field.continued,
        //
        //             // value               : config && config.hasOwnProperty(name) ? config[ name ] : this[ name ],
        //
        //             calculationContext  : calculationFunction ? this : undefined,
        //             calculation         : calculationFunction,
        //
        //             // setterPropagation   : field.atomSetterPropagation
        //         })
        //
        //         if (config.hasOwnProperty(name)) {
        //             fieldAtom.writeValue(config[name])
        //         }
        //         else if (this[ name ] !== undefined) {
        //             fieldAtom.writeValue(this[ name ])
        //         }
        //     })
        // }


        // the actually returned type is `FieldAtom`, but this does not typecheck - circularity
        createFieldAtom (name : Name) : ChronoAtom {
            const field     = this.$entity.getField(name)

            const calculationFunction   = this.$calculations && this[ this.$calculations[ name ] ]

            return field.atomCls.new({
                id          : `${this.$$.id}/${name}`,

                field       : field,

                self        : this,

                shouldCommitValue   : !field.continued,

                calculationContext  : calculationFunction ? this : undefined,
                calculation         : calculationFunction,
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

    // initialize (config : object) {
    //     this.initAtoms(config || {})
    //
    //     super.initialize(config)
    // }
}

export type EntityBase = Mixin<typeof EntityBase>


//---------------------------------------------------------------------------------------------------------------------
export const generalField = function (fieldCls : typeof Field, fieldConfig? : unknown) : PropertyDecorator {

    return function (target : EntityAny, propertyKey : string) : void {
        let entity      = target.$entity

        if (!entity) {
            // NOTE: entity should be created at the topmost non native prototype
            //       such it will be accessible from any topmost mixin static methods or accessors
            //       it might not be obvious why it's useful here, but further experience has shown
            //       that it is.
            // TODO: review
            let entityTarget    = target,
                nextPrototype   = Object.getPrototypeOf(entityTarget)

            while (nextPrototype !== Object.prototype) {
                entityTarget    = nextPrototype
                nextPrototype   = Object.getPrototypeOf(nextPrototype)
            }

            entity              = entityTarget.$entity = EntityData.new()
        }

        const field             = entity.addField(
            fieldCls.new(Object.assign(fieldConfig || {}, {
                name            : propertyKey
            }))
        );

        if (field.createAccessors) {

            Object.defineProperty(target, propertyKey, {
                get     : function () {
                    return this.$[ propertyKey ].get()
                },

                set     : function (value : any) {
                    return this.$[ propertyKey ].put(value)
                }
            })

            const setterFnName = `set${propertyKey.slice(0, 1).toUpperCase()}${propertyKey.slice(1)}`

            if (!(setterFnName in target)) {
                target[ setterFnName ] = function (value : any) : Promise<any> {
                    return this.$[ propertyKey ].set(value)
                }
            }
        }
    }
}



//---------------------------------------------------------------------------------------------------------------------
// `target` will be a prototype of the class with Entity mixin
export const field : PropertyDecorator = generalField(Field)


//---------------------------------------------------------------------------------------------------------------------
// `target` will be a prototype of the class with Entity mixin
export const storage : PropertyDecorator = generalField(ReferenceStorageField)


//---------------------------------------------------------------------------------------------------------------------
export const reference = function (storageKey : string) : PropertyDecorator {
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
export const resolver = function (resolverFunc : ResolverFunc) : PropertyDecorator {

    return function (target : EntityAny, propertyKey : string) : void {
        const entity            = target.$entity
        const field             = entity.getField(propertyKey) as ReferenceField

        field.resolver          = resolverFunc
    }
}



//---------------------------------------------------------------------------------------------------------------------
export const calculate = function (fieldName : Name) : MethodDecorator {

    // `target` will be a prototype of the class with Entity mixin
    return function (target : EntityAny, propertyKey : string, /*descriptor*/_ : TypedPropertyDescriptor<any>) : void {
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
