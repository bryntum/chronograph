import { Effect } from "../chrono/Effect.js";
import { PropagationResult } from "../chrono/Graph.js";
import { Entity as EntityData } from "../schema/Entity.js";
import { Field } from "../schema/Field.js";
import { lazyBuild, uppercaseFirst } from "../util/Helper.js";
import { MinimalEntityAtom } from "./Atom.js";
import { isReplica } from "./Replica.js";
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
const isEntityMarker = Symbol('isEntity');
//---------------------------------------------------------------------------------------------------------------------
export const Entity = (base) => {
    class Entity extends base {
        // marker in the prototype
        [isEntityMarker]() { }
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
        get $entity() {
            // this will lazily create an EntityData instance in the prototype
            return createEntityOnPrototype(this.constructor.prototype);
        }
        get $() {
            const atomsCollection = {};
            this.$entity.forEachField((field, name) => {
                atomsCollection[name] = this.createFieldAtom(field);
            });
            return lazyBuild(this, '$', atomsCollection);
        }
        get $$() {
            return lazyBuild(this, '$$', MinimalEntityAtom.new({
                entity: this.$entity,
                self: this,
                // entity atom is considered changed if any of its incoming atoms has changed
                // this just means if it's calculation method has been called, it should always
                // assign a new value
                equality: () => false,
                calculation: this.calculateSelf,
                calculationContext: this
            }));
        }
        *calculateSelf() {
            return this;
        }
        createFieldAtom(field) {
            const name = field.name;
            const calculationFunction = this.$calculations && this[this.$calculations[name]];
            return field.atomCls.new({
                id: `${this.$$.id}/${name}`,
                field: field,
                self: this,
                calculationContext: calculationFunction ? this : undefined,
                calculation: calculationFunction
            });
        }
        getGraph() {
            return this.$$.graph;
        }
        forEachFieldAtom(func) {
            const fields = this.$;
            for (let name in fields) {
                func.call(this, fields[name], name);
            }
        }
        enterGraph(graph) {
            this.forEachFieldAtom(field => graph.addNode(field));
            graph.addNode(this.$$);
        }
        leaveGraph() {
            const graph = this.$$.graph;
            if (graph) {
                this.forEachFieldAtom(field => graph.removeNode(field));
                graph.removeNode(this.$$);
            }
        }
        isPropagating() {
            return this.getGraph().isPropagating;
        }
        async propagate(onEffect) {
            const graph = this.getGraph();
            return graph && graph.propagate(onEffect) || Promise.resolve(PropagationResult.Completed);
        }
        async waitForPropagateCompleted() {
            return this.getGraph().waitForPropagateCompleted();
        }
        async tryPropagateWithNodes(onEffect, nodes, hatchFn) {
            return this.getGraph().tryPropagateWithNodes(onEffect, nodes, hatchFn);
        }
        async tryPropagateWithEntities(onEffect, entities, hatchFn) {
            const graph = this.getGraph();
            let result;
            if (isReplica(graph)) {
                result = graph.tryPropagateWithEntities(onEffect, entities, hatchFn);
            }
            else {
                throw new Error("Entity is not part of replica");
            }
            return result;
        }
        markAsNeedRecalculation(atom) {
            this.getGraph().markAsNeedRecalculation(atom);
        }
        static getField(name) {
            return this.getEntity().getField(name);
        }
        static getEntity() {
            return ensureEntityOnPrototype(this.prototype);
        }
        run(methodName, ...args) {
            const iterator = this[methodName](...args);
            let iteratorValue;
            let nextArgs;
            do {
                iteratorValue = iterator.next(nextArgs);
                const value = iteratorValue.value;
                if (value instanceof Effect)
                    throw new Error("Helper methods can not yield effects during computation");
                if (iteratorValue.done)
                    return value;
                // TODO check for `value` to actually be ChronoAtom
                const atom = value;
                if (this.getGraph().isAtomNeedRecalculation(atom))
                    throw new Error("Can not use stale atom for calculations");
                nextArgs = atom.get();
            } while (true);
        }
    }
    return Entity;
};
//---------------------------------------------------------------------------------------------------------------------
export const createEntityOnPrototype = (proto) => {
    let parent = Object.getPrototypeOf(proto);
    return lazyBuild(proto, '$entity', EntityData.new({ parentEntity: parent.hasOwnProperty(isEntityMarker) ? null : parent.$entity }));
};
//---------------------------------------------------------------------------------------------------------------------
export const ensureEntityOnPrototype = (proto) => {
    let entity = proto.$entity;
    if (!proto.hasOwnProperty('$entity'))
        entity = createEntityOnPrototype(proto);
    return entity;
};
/**
 * The "generic" field decorator, in the sense, that it allows specifying both field config and field class.
 * This means it can create any field instance.
 */
export const generic_field = (fieldConfig, fieldCls = Field) => {
    return function (target, propertyKey) {
        let entity = ensureEntityOnPrototype(target);
        const field = entity.addField(fieldCls.new(Object.assign(fieldConfig || {}, {
            name: propertyKey
        })));
        if (field.createAccessors) {
            Object.defineProperty(target, propertyKey, {
                get: function () {
                    return this.$[propertyKey].get();
                },
                set: function (value) {
                    return this.$[propertyKey].put(value);
                }
            });
            const getterFnName = `get${uppercaseFirst(propertyKey)}`;
            const setterFnName = `set${uppercaseFirst(propertyKey)}`;
            if (!(getterFnName in target)) {
                target[getterFnName] = function (...args) {
                    return this.$[propertyKey].get(...args);
                };
            }
            if (!(setterFnName in target)) {
                target[setterFnName] = function (...args) {
                    return this.$[propertyKey].set(...args);
                };
            }
        }
    };
};
//---------------------------------------------------------------------------------------------------------------------
export const field = generic_field;
//---------------------------------------------------------------------------------------------------------------------
export const calculate = function (fieldName) {
    // `target` will be a prototype of the class with Entity mixin
    return function (target, propertyKey, /*descriptor*/ _) {
        let calculations = target.$calculations;
        if (!calculations)
            calculations = target.$calculations = {};
        calculations[fieldName] = propertyKey;
    };
};
