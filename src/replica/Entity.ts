import { AnyConstructor, Mixin } from "../class/Mixin.js"
import { Entity as EntityData } from "../schema/Entity.js"
import { Field, Name } from "../schema/Field.js"
import { defineProperty } from "../util/Helpers.js"


const isEntityMarker      = Symbol('isEntity')

//---------------------------------------------------------------------------------------------------------------------
export const Entity = <T extends AnyConstructor<object>>(base : T) => {

    class Entity extends base {
        // marker in the prototype
        [isEntityMarker] () {}

        // $calculations   : { [s in keyof this] : string }

        // lazy meta instance creation - will work even w/o any @field or @entity decorator
        get $entity () : EntityData {
            // this will lazily create an EntityData instance in the prototype
            return createEntityOnPrototype(this.constructor.prototype)
        }


        // get $ () : { [s in keyof this] : FieldAtomI } {
        //     const atomsCollection   = {}
        //
        //     this.$entity.forEachField((field : Field, name : Name) => {
        //         atomsCollection[ name ] = this.createFieldAtom(field)
        //     })
        //
        //     return defineProperty(this as any, '$', atomsCollection)
        // }


        // get $$ () : EntityQuarkI {
        //     return defineProperty(this, '$$', MinimalEntityQuark.new({
        //         entity              : this.$entity,
        //
        //         self                : this,
        //
        //         // entity atom is considered changed if any of its incoming atoms has changed
        //         // this just means if it's calculation method has been called, it should always
        //         // assign a new value
        //         equality            : () => false,
        //
        //         calculation         : this.calculateSelf,
        //         calculationContext  : this
        //     }))
        // }
        //
        //
        // * calculateSelf () : CalculationIterator<this> {
        //     return this
        // }


        // createFieldAtom (field : Field) : FieldAtomI {
        //     const name                  = field.name
        //
        //     const calculationFunction   = this.$calculations && this[ this.$calculations[ name ] ]
        //
        //     return field.atomCls.new({
        //         id                  : `${this.$$.id}/${name}`,
        //
        //         field               : field,
        //
        //         self                : this,
        //
        //         calculationContext  : calculationFunction ? this : undefined,
        //         calculation         : calculationFunction
        //     })
        // }
        //
        //
        // getGraph () : ChronoGraph {
        //     return this.$$.graph
        // }
        //
        //
        // forEachFieldAtom<T extends this> (func : (field : MinimalFieldAtom, name : keyof T) => any) {
        //     const fields        = this.$
        //
        //     for (let name in fields) {
        //         func.call(this, fields[ name ], name)
        //     }
        // }
        //
        //
        // enterGraph (graph : ChronoGraph) {
        //     this.forEachFieldAtom(field => graph.addNode(field))
        //
        //     graph.addNode(this.$$)
        // }
        //
        //
        // leaveGraph () {
        //     const graph     = this.$$.graph
        //
        //     if (graph) {
        //         this.forEachFieldAtom(field => graph.removeNode(field))
        //
        //         graph.removeNode(this.$$)
        //     }
        // }
        //
        // isPropagating () {
        //     return this.getGraph().isPropagating
        // }
        //
        // async propagate (onEffect? : EffectResolverFunction) : Promise<PropagationResult> {
        //     const graph = this.getGraph()
        //
        //     return graph && graph.propagate(onEffect) || Promise.resolve(PropagationResult.Completed)
        // }
        //
        //
        // async waitForPropagateCompleted () : Promise<PropagationResult | null> {
        //     return this.getGraph().waitForPropagateCompleted()
        // }
        //
        //
        // async tryPropagateWithNodes (onEffect? : EffectResolverFunction, nodes? : ChronoAtom[], hatchFn? : Function) : Promise<PropagationResult> {
        //     return this.getGraph().tryPropagateWithNodes(onEffect, nodes, hatchFn)
        // }
        //
        //
        // async tryPropagateWithEntities (onEffect? : EffectResolverFunction, entities? : Entity[], hatchFn? : Function) : Promise<PropagationResult> {
        //     const graph = this.getGraph()
        //
        //     let result
        //
        //     if (isReplica(graph)) {
        //         result = graph.tryPropagateWithEntities(onEffect, entities, hatchFn)
        //     }
        //     else {
        //         throw new Error("Entity is not part of replica")
        //     }
        //
        //     return result
        // }
        //
        //
        // markAsNeedRecalculation (atom : ChronoAtom) {
        //     this.getGraph().markAsNeedRecalculation(atom)
        // }


        static getField (name : Name) : Field {
            return this.getEntity().getField(name)
        }


        static getEntity () : EntityData {
            return ensureEntityOnPrototype(this.prototype)
        }


        // run <Name extends keyof this, S extends AnyFunction & this[ Name ]> (methodName : Name, ...args : Parameters<S>)
        //     : ReturnType<S> extends ChronoIterator<infer Res1> ? Res1 : ReturnType<S> extends IterableIterator<infer Res2> ? Res2 : ReturnType<S>
        // {
        //     const iterator      = (this[ methodName ] as S)(...args)
        //
        //     let iteratorValue : IteratorResult<any>
        //
        //     let nextArgs : any
        //
        //     do {
        //         iteratorValue   = iterator.next(nextArgs)
        //
        //         const value     = iteratorValue.value
        //
        //         if (value instanceof Effect) throw new Error("Helper methods can not yield effects during computation")
        //
        //         if (iteratorValue.done) return value
        //
        //         // TODO check for `value` to actually be ChronoAtom
        //         const atom : ChronoAtom = value
        //
        //         if (this.getGraph().isAtomNeedRecalculation(atom)) throw new Error("Can not use stale atom for calculations")
        //
        //         nextArgs        = atom.get()
        //     } while (true)
        // }
    }

    return Entity
}

export type Entity = Mixin<typeof Entity>


//---------------------------------------------------------------------------------------------------------------------
export const createEntityOnPrototype = (proto : any) : EntityData => {
    let parent      = Object.getPrototypeOf(proto)

    // the `hasOwnProperty` condition will be `true` for the `Entity` mixin itself
    // if the parent is `Entity` mixin, then this is a top-level entity
    return defineProperty(proto, '$entity', EntityData.new({ parentEntity : parent.hasOwnProperty(isEntityMarker) ? null : parent.$entity }))
}


//---------------------------------------------------------------------------------------------------------------------
export const ensureEntityOnPrototype = (proto : any) : EntityData => {
    let entity      = proto.$entity

    if (!proto.hasOwnProperty('$entity')) entity = createEntityOnPrototype(proto)

    return entity
}


// export type FieldDecorator<Default extends AnyConstructor = typeof Field> =
//     <T extends Default = Default> (fieldConfig? : Partial<InstanceType<T>>, fieldCls? : T | Default) => PropertyDecorator
//
//
// /**
//  * The "generic" field decorator, in the sense, that it allows specifying both field config and field class.
//  * This means it can create any field instance.
//  */
// export const generic_field : FieldDecorator<typeof Field> =
//     <T extends typeof Field = typeof Field> (fieldConfig? : Partial<InstanceType<T>>, fieldCls : T | typeof Field = Field) : PropertyDecorator => {
//
//         return function (target : Entity, propertyKey : string) : void {
//             let entity      = ensureEntityOnPrototype(target)
//
//             const field     = entity.addField(
//                 fieldCls.new(Object.assign(fieldConfig || {}, {
//                     name    : propertyKey
//                 } as Partial<InstanceType<T>>))
//             )
//
//             if (field.createAccessors) {
//
//                 Object.defineProperty(target, propertyKey, {
//                     get     : function () {
//                         return this.$[ propertyKey ].get()
//                     },
//
//                     set     : function (value : any) {
//                         return this.$[ propertyKey ].put(value)
//                     }
//                 })
//
//                 const getterFnName = `get${ uppercaseFirst(propertyKey) }`
//                 const setterFnName = `set${ uppercaseFirst(propertyKey) }`
//
//                 if (!(getterFnName in target)) {
//                     target[ getterFnName ] = function (...args) : unknown {
//                         return this.$[ propertyKey ].get(...args)
//                     }
//                 }
//
//                 if (!(setterFnName in target)) {
//                     target[ setterFnName ] = function (...args) : Promise<PropagationResult> {
//                         return this.$[ propertyKey ].set(...args)
//                     }
//                 }
//             }
//         }
//     }
//
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export const field : typeof generic_field = generic_field
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export const calculate = function (fieldName : Name) : MethodDecorator {
//
//     // `target` will be a prototype of the class with Entity mixin
//     return function (target : Entity, propertyKey : string, /*descriptor*/_ : TypedPropertyDescriptor<any>) : void {
//         let calculations        = target.$calculations
//
//         if (!calculations) calculations = target.$calculations = <any> {}
//
//         calculations[ fieldName ]       = propertyKey
//     }
// }
