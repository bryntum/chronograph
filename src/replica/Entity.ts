import { ChronoAtom, ChronoIterator } from "../chrono/Atom.js"
import { Effect, EffectResolverFunction } from "../chrono/Effect.js"
import { ChronoGraph, PropagationResult } from "../chrono/Graph.js"
import { AnyConstructor, AnyFunction, Mixin } from "../class/Mixin.js"
import { Entity as EntityData } from "../schema/Entity.js"
import { Field, Name } from "../schema/Field.js"
import { lazyBuild, uppercaseFirst } from "../util/Helper.js"
import { EntityAtomI, FieldAtom, FieldAtomI, MinimalEntityAtom, MinimalFieldAtom } from "./Atom.js"
import { isReplica } from "./Replica.js"


// LAZY ATOMS CREATION - investigate if it improves performance
// current issues
// 1) when entity enters a graph, the yet unreferenced atoms are not created yet (naturally)
// so they are not calculated
// need to create AND calculate them **synchronously** later, on-demand - how to deal with effects?

// const atomsCollectionMixin = (base : typeof Base, name) =>
//
// class AtomsCollection extends base {
// POSSIBLE OPTIMIZATION - use more than 1 getter, like: const atomsCollectionMixin = (base : typeof Base, name1, name2, name3)
//     get [name] () {
//         return super[ name ] = (this as any).host.createFieldAtom(name)
//     }
// }
//

const isEntityMarker      = Symbol('isEntity')

//---------------------------------------------------------------------------------------------------------------------
export const Entity = <T extends AnyConstructor<object>>(base : T) => {

    class Entity extends base {
        // marker in the prototype
        [isEntityMarker] () {}

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

        // // TODO this is not completed, needs to check against the full set of "maybe dirty" atoms during propagation
        // // this is an optimization idea, based on assumption, that "yielding" is expensive
        // // so if we'll "inline" the "need recalculation" check for not stale atoms, we get some performance improvement
        // * resolve <T extends keyof this> (atomName : T) : ChronoIterator<this[ T ]> {
        //     const atom : FieldAtom      = this.$[ atomName ]
        //     const graph                 = atom.graph
        //
        //     if (graph) {
        //         if (graph.isAtomNeedRecalculation(atom)) {
        //             return yield atom
        //         } else {
        //             return atom.get()
        //         }
        //     } else {
        //         return atom.get()
        //     }
        // }


        // lazy meta instance creation - will work even w/o any @field or @entity decorator
        get $entity () : EntityData {
            // this will lazily create an EntityData instance in the prototype
            return createEntityOnPrototype(this.constructor.prototype)
        }


        get $ () : { [s in keyof this] : FieldAtomI } {
            const atomsCollection   = {}

            this.$entity.forEachField((field : Field, name : Name) => {
                atomsCollection[ name ] = this.createFieldAtom(field)
            })

            return lazyBuild(this as any, '$', atomsCollection)
        }


        get $$ () : EntityAtomI {
            return lazyBuild(this, '$$', MinimalEntityAtom.new({
                entity              : this.$entity,

                self                : this,

                // entity atom is considered changed if any of its incoming atoms has changed
                // this just means if it's calculation method has been called, it should always
                // assign a new value
                equality            : () => false,

                calculation         : this.calculateSelf,
                calculationContext  : this
            }))
        }


        * calculateSelf () : ChronoIterator<this> {
            return this
        }


        createFieldAtom (field : Field) : FieldAtomI {
            const name                  = field.name

            const calculationFunction   = this.$calculations && this[ this.$calculations[ name ] ]

            return field.atomCls.new({
                id                  : `${this.$$.id}/${name}`,

                field               : field,

                self                : this,

                calculationContext  : calculationFunction ? this : undefined,
                calculation         : calculationFunction
            })
        }


        getGraph () : ChronoGraph {
            return this.$$.graph
        }


        forEachFieldAtom<T extends this> (func : (field : MinimalFieldAtom, name : keyof T) => any) {
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

        isPropagating () {
            return this.getGraph().isPropagating
        }

        /**
         * Suspend propagation processing. When propagation is suspended, calls to propagate
         * do not proceed, instead a propagate call is deferred until a matching
         * _resumePropagate_ is called.
         */
        suspendPropagate () {
            const graph = this.getGraph()
            graph && graph.suspendPropagate()
        }

        /**
         * Resume propagation. If propagation is resumed (calls may be nested which increments a
         * suspension counter), then if a call to propagate was made during suspension, propagate is
         * executed.
         * @param {Boolean} [trigger] Pass `false` to inhibit automatic propagation if propagate was requested during suspension.
         */
        async resumePropagate (trigger? : Boolean) {
            const graph = this.getGraph()
            return graph && graph.resumePropagate(trigger) || Promise.resolve(PropagationResult.Completed)
        }

        async propagate (onEffect? : EffectResolverFunction, dryRun : (boolean | Function) = false) : Promise<PropagationResult> {
            const graph = this.getGraph()

            return graph && graph.propagate(onEffect, dryRun) || Promise.resolve(PropagationResult.Completed)
        }

        async waitForPropagateCompleted () : Promise<PropagationResult | null> {
            return this.getGraph().waitForPropagateCompleted()
        }


        async tryPropagateWithNodes (onEffect? : EffectResolverFunction, nodes? : ChronoAtom[], hatchFn? : Function) : Promise<PropagationResult> {
            return this.getGraph().tryPropagateWithNodes(onEffect, nodes, hatchFn)
        }


        async tryPropagateWithEntities (onEffect? : EffectResolverFunction, entities? : Entity[], hatchFn? : Function) : Promise<PropagationResult> {
            const graph = this.getGraph()

            let result

            if (isReplica(graph)) {
                result = graph.tryPropagateWithEntities(onEffect, entities, hatchFn)
            }
            else {
                throw new Error("Entity is not part of replica")
            }

            return result
        }


        markAsNeedRecalculation (atom : ChronoAtom) {
            this.getGraph().markAsNeedRecalculation(atom)
        }


        markStable (atom : ChronoAtom) {
            this.getGraph().markStable(atom)
        }


        static getField (name : Name) : Field {
            return this.getEntity().getField(name)
        }


        static getEntity () : EntityData {
            return ensureEntityOnPrototype(this.prototype)
        }


        run <Name extends keyof this, S extends AnyFunction & this[ Name ]> (methodName : Name, ...args : Parameters<S>)
            : ReturnType<S> extends ChronoIterator<infer Res1> ? Res1 : ReturnType<S> extends IterableIterator<infer Res2> ? Res2 : ReturnType<S>
        {
            const iterator      = (this[ methodName ] as S)(...args)

            let iteratorValue : IteratorResult<any>

            let nextArgs : any

            do {
                iteratorValue   = iterator.next(nextArgs)

                const value     = iteratorValue.value

                if (value instanceof Effect) throw new Error("Helper methods can not yield effects during computation")

                if (iteratorValue.done) return value

                // TODO check for `value` to actually be ChronoAtom
                const atom : ChronoAtom = value

                if (this.getGraph().isAtomNeedRecalculation(atom)) throw new Error("Can not use stale atom for calculations")

                nextArgs        = atom.get()
            } while (true)
        }
    }

    return Entity
}

export type Entity = Mixin<typeof Entity>


//---------------------------------------------------------------------------------------------------------------------
export const createEntityOnPrototype = (proto : any) : EntityData => {
    let parent      = Object.getPrototypeOf(proto)

    return lazyBuild(proto, '$entity', EntityData.new({ parentEntity : parent.hasOwnProperty(isEntityMarker) ? null : parent.$entity }))
}


//---------------------------------------------------------------------------------------------------------------------
export const ensureEntityOnPrototype = (proto : any) : EntityData => {
    let entity      = proto.$entity

    if (!proto.hasOwnProperty('$entity')) entity = createEntityOnPrototype(proto)

    return entity
}


export type FieldDecorator<Default extends AnyConstructor = typeof Field> =
    <T extends Default = Default> (fieldConfig? : Partial<InstanceType<T>>, fieldCls? : T | Default) => PropertyDecorator


/**
 * The "generic" field decorator, in the sense, that it allows specifying both field config and field class.
 * This means it can create any field instance.
 */
export const generic_field : FieldDecorator<typeof Field> =
    <T extends typeof Field = typeof Field> (fieldConfig? : Partial<InstanceType<T>>, fieldCls : T | typeof Field = Field) : PropertyDecorator => {

        return function (target : Entity, propertyKey : string) : void {
            let entity      = ensureEntityOnPrototype(target)

            const field     = entity.addField(
                fieldCls.new(Object.assign(fieldConfig || {}, {
                    name    : propertyKey
                } as Partial<InstanceType<T>>))
            )

            if (field.createAccessors) {

                Object.defineProperty(target, propertyKey, {
                    get     : function () {
                        return this.$[ propertyKey ].get()
                    },

                    set     : function (value : any) {
                        return this.$[ propertyKey ].put(value)
                    }
                })

                const getterFnName = `get${ uppercaseFirst(propertyKey) }`
                const setterFnName = `set${ uppercaseFirst(propertyKey) }`

                if (!(getterFnName in target)) {
                    target[ getterFnName ] = function (...args) : unknown {
                        return this.$[ propertyKey ].get(...args)
                    }
                }

                if (!(setterFnName in target)) {
                    target[ setterFnName ] = function (...args) : Promise<PropagationResult> {
                        return this.$[ propertyKey ].set(...args)
                    }
                }
            }
        }
    }



//---------------------------------------------------------------------------------------------------------------------
export const field : typeof generic_field = generic_field


//---------------------------------------------------------------------------------------------------------------------
export const calculate = function (fieldName : Name) : MethodDecorator {

    // `target` will be a prototype of the class with Entity mixin
    return function (target : Entity, propertyKey : string, /*descriptor*/_ : TypedPropertyDescriptor<any>) : void {
        let calculations        = target.$calculations

        if (!calculations) calculations = target.$calculations = <any> {}

        calculations[ fieldName ]       = propertyKey
    }
}
