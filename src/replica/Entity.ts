import {ChronoAtom} from "../chrono/Atom.js";
import {ChronoGraph, PropagationResult} from "../chrono/Graph.js";
import {Constructable, Mixin} from "../class/Mixin.js";
import {Entity as EntityData} from "../schema/Entity.js";
import {Field, Name} from "../schema/Field.js";
import {EntityAtom, FieldAtom, MinimalEntityAtom, MinimalFieldAtom} from "./Atom.js";


// LAZY ATOMS CREATION - investigate if it improves performance
// current issues
// 1) when entity enters a graph, the yet unreferenced atoms are not created yet (naturally)
// so they are not calculated
// need to create AND calculate them immediately later, on-demand

// const atomsCollectionMixin = (base : typeof Base, name) =>
//
// class AtomsCollection extends base {
// POSSIBLE OPTIMIZATION - use more than 1 getter, like: const atomsCollectionMixin = (base : typeof Base, name1, name2, name3)
//     get [name] () {
//         return super[ name ] = (this as any).host.createFieldAtom(name)
//     }
// }
//


//---------------------------------------------------------------------------------------------------------------------
export const Entity = <T extends Constructable<object>>(base : T) => {

    class Entity extends base {
        $entity         : EntityData

        $calculations   : { [s in keyof this] : string }

// LAZY ATOMS CREATION - investigate if it improves performance
//         static atomsCollectionCls : AnyConstructor
//
//         static getAtomsCollectionCls () : AnyConstructor {
//             if (this.atomsCollectionCls) return this.atomsCollectionCls
//
//             let cls         = Base
//
//             this.prototype.$entity.fields.forEach((field : Field, name : Name) => {
//                 cls         = atomsCollectionMixin(cls, name)
//             })
//
//             return this.atomsCollectionCls = cls
//         }
//
//
//         get $ () : { [s in keyof this] : MinimalFieldAtom } {
//             // @ts-ignore
//             const atomsCollection   = this.constructor.getAtomsCollectionCls().new()
//
//             Object.defineProperty(atomsCollection, 'host', { enumerable : false, value : this })
//
//             // @ts-ignore
//             return super.$          = atomsCollection
//         }


        get $() : { [s in keyof this] : FieldAtom } {
            const atomsCollection   = {}

            this.$entity.forEachField((field : Field, name : Name) => {
                atomsCollection[ name ] = this.createFieldAtom(field)
            })

            Object.defineProperty(this, '$', {
                value       : atomsCollection
            })

            return atomsCollection as any
        }


        get $$() : EntityAtom {
            const value     = MinimalEntityAtom.new({ entity : this.$entity, value : this, self : this })

            Object.defineProperty(this, '$$', {
                value       : value
            })

            return value
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
        createFieldAtom (field : Field) : ChronoAtom {
            const name                  = field.name

            const calculationFunction   = this.$calculations && this[ this.$calculations[ name ] ]

            return field.atomCls.new({
                id                  : `${this.$$.id}/${name}`,

                field               : field,

                self                : this,

                shouldCommitValue   : !field.continued,

                calculationContext  : calculationFunction ? this : undefined,
                calculation         : calculationFunction
            })
        }


        getGraph () : ChronoGraph {
            return this.$$.graph
        }


        forEachFieldAtom (func : (field : MinimalFieldAtom, name : Name) => any) {
            const fields        = this.$

            for (let name in fields) {
                func.call(this, fields[ name ], name)
            }
        }


        enterGraph (graph : ChronoGraph) {
            this.forEachFieldAtom(field => graph.addNode(field))

            graph.addNode(this.$$)
        }


        leaveGraph () {
            const graph     = this.$$.graph

            if (graph) {
                this.forEachFieldAtom(field => graph.removeNode(field))

                graph.removeNode(this.$$)
            }
        }


        async propagate () : Promise<PropagationResult> {
            return this.getGraph().propagate()
        }


        markAsNeedRecalculation (atom : ChronoAtom) {
            this.getGraph().markAsNeedRecalculation(atom)
        }


        markStable (atom : ChronoAtom) {
            this.getGraph().markStable(atom)
        }


        // isStable (atom : ChronoAtom) : boolean {
        //     return this.getGraph().isAtomStable(atom)
        // }


        // processNext (atom : ChronoAtom) {
        //     this.getGraph().processNext(atom)
        // }




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
export const createEntityOnPrototype = (proto : any) : EntityData => {
    let parent      = Object.getPrototypeOf(proto)

    let parentEntity : EntityData

    while (parent && parent !== Object.prototype) {
        if (parent.$entity) {
            parentEntity    = parent.$entity
            break
        }

        parent              = Object.getPrototypeOf(parent)
    }

    const entity            = EntityData.new({ parentEntity })

    return proto.$entity    = entity
}


//---------------------------------------------------------------------------------------------------------------------
export const generic_field = function (fieldCls : typeof Field, fieldConfig? : object) : PropertyDecorator {

    return function (target : Entity, propertyKey : string) : void {
        let entity      = target.$entity

        if (!target.hasOwnProperty('$entity')) {
            entity      = createEntityOnPrototype(target)
        }

        const field     = entity.addField(
            fieldCls.new(Object.assign(fieldConfig || {}, {
                name    : propertyKey
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

            const setterFnName = `set${ propertyKey.slice(0, 1).toUpperCase() }${ propertyKey.slice(1) }`

            if (!(setterFnName in target)) {
                target[ setterFnName ] = function (...args) : Promise<any> {
                    return this.$[ propertyKey ].set(...args)
                }
            }
        }
    }
}



//---------------------------------------------------------------------------------------------------------------------
// `target` will be a prototype of the class with Entity mixin
export const field : PropertyDecorator = generic_field(Field)


//---------------------------------------------------------------------------------------------------------------------
export const continuationOf = function (continuationOfAtomName : string) : PropertyDecorator {

    return function (target : Entity, propertyKey : string) : void {
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
    return function (target : Entity, propertyKey : string, /*descriptor*/_ : TypedPropertyDescriptor<any>) : void {
        let calculations        = target.$calculations

        if (!calculations) calculations = target.$calculations = <any>{}

        calculations[ fieldName ]       = propertyKey
    }
}
