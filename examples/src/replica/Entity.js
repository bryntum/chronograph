import { CommitZero } from "../chrono/Graph.js";
import { Identifier } from "../chrono/Identifier.js";
import { Mixin } from "../class/BetterMixin.js";
import { DEBUG, debug, SourceLinePoint } from "../environment/Debug.js";
import { runGeneratorSyncWithEffect } from "../primitives/Calculation.js";
import { EntityMeta } from "../schema/EntityMeta.js";
import { Field } from "../schema/Field.js";
import { defineProperty, uppercaseFirst } from "../util/Helpers.js";
import { MinimalEntityIdentifier } from "./Identifier.js";
const isEntityMarker = Symbol('isEntity');
//---------------------------------------------------------------------------------------------------------------------
/**
 * Entity [[Mixin|mixin]]. When applied to some base class (recommended one is [[Base]]), turns it into entity.
 * Entity may have several fields, which are properties decorated with [[field]] decorator.
 *
 * To apply this mixin use the `Entity.mix` property, which represents the mixin lambda.
 *
 * Another decorator, [[calculate]], marks the method, that will be used to calculate the value of field.
 *
 * Example:
 *
 * ```ts
 * class Author extends Entity.mix(Base) {
 *     @field()
 *     firstName       : string
 *     @field()
 *     lastName        : string
 *     @field()
 *     fullName        : string
 *
 *     @calculate('fullName')
 *     calculateFullName () : string {
 *         return this.firstName + ' ' + this.lastName
 *     }
 * }
 * ```
 *
 */
export class Entity extends Mixin([], (base) => {
    class Entity extends base {
        // marker in the prototype to identify whether the parent class is Entity mixin itself
        // it is not used for `instanceof` purposes and not be confused with the [MixinInstanceOfProperty]
        // (though it is possible to use MixinInstanceOfProperty for this purpose, that would require to
        // make it public
        [isEntityMarker]() { }
        /**
         * An [[EntityMeta]] instance, representing the "meta" information about the entity class. It is shared among all instances
         * of the class.
         */
        get $entity() {
            // this will lazily create an EntityData instance in the prototype
            return createEntityOnPrototype(this.constructor.prototype);
        }
        /**
         * An object, which properties corresponds to the ChronoGraph [[Identifier]]s, created for every field.
         *
         * For example:
         *
         * ```ts
         * class Author extends Entity.mix(Base) {
         *     @field()
         *     firstName       : string
         *     @field()
         *     lastName        : string
         * }
         *
         * const author = Author.new()
         *
         * // identifier for the field `firstName`
         * author.$.firstName
         *
         * const firstName = replica.read(author.$.firstName)
         * ```
         */
        get $() {
            const $ = {};
            this.$entity.forEachField((field, name) => {
                $[name] = this.createFieldIdentifier(field);
            });
            if (DEBUG) {
                const proxy = new Proxy($, {
                    get(entity, property, receiver) {
                        if (!entity[property])
                            debug(new Error(`Attempt to read a missing field ${String(property)} on ${entity}`));
                        entity[property].SOURCE_POINT = SourceLinePoint.fromThisCall();
                        return entity[property];
                    }
                });
                return defineProperty(this, '$', proxy);
            }
            else {
                return defineProperty(this, '$', $);
            }
        }
        /**
         * A graph identifier, that represents the whole entity.
         */
        get $$() {
            return defineProperty(this, '$$', MinimalEntityIdentifier.new({
                name: this.$entityName,
                entity: this.$entity,
                calculation: this.calculateSelf,
                context: this,
                self: this,
            }));
        }
        get $entityName() {
            return this.constructor.name || this.$entity.name;
        }
        *calculateSelf() {
            return this;
        }
        createFieldIdentifier(field) {
            const name = field.name;
            const entity = this.$entity;
            const constructor = this.constructor;
            const skeleton = entity.$skeleton;
            if (!skeleton[name])
                skeleton[name] = constructor.getIdentifierTemplateClass(this, field);
            const identifier = new skeleton[name]();
            identifier.context = this;
            identifier.self = this;
            identifier.name = `${this.$$.name}.$.${field.name}`;
            return identifier;
        }
        forEachFieldIdentifier(func) {
            this.$entity.forEachField((field, name) => func(this.$[name], name));
        }
        /**
         * This method is called when entity is added to some replica.
         *
         * @param replica
         */
        enterGraph(replica) {
            if (this.graph)
                throw new Error('Already entered replica');
            this.graph = replica;
            replica.addIdentifier(this.$$);
            this.$entity.forEachField((field, name) => {
                const identifier = this.$[name];
                replica.addIdentifier(identifier, identifier.DATA);
                identifier.DATA = undefined;
            });
        }
        /**
         * This method is called when entity is removed from the replica it's been added to.
         */
        leaveGraph(graph) {
            const ownGraph = this.graph;
            const removeFrom = graph || ownGraph;
            if (!removeFrom)
                return;
            this.$entity.forEachField((field, name) => removeFrom.removeIdentifier(this.$[name]));
            removeFrom.removeIdentifier(this.$$);
            if (removeFrom === ownGraph)
                this.graph = undefined;
        }
        // isPropagating () {
        //     return this.getGraph().isPropagating
        // }
        propagate(arg) {
            return this.commit(arg);
        }
        /**
         * This is a convenience method, that just delegates to the [[ChronoGraph.commit]] method of this entity's graph.
         *
         * If there's no graph (entity has not been added to any replica) a [[CommitZero]] constant will be returned.
         */
        commit(arg) {
            const graph = this.graph;
            if (!graph)
                return CommitZero;
            return graph.commit(arg);
        }
        async propagateAsync() {
            return this.commitAsync();
        }
        /**
         * This is a convenience method, that just delegates to the [[ChronoGraph.commitAsync]] method of this entity's graph.
         *
         * If there's no graph (entity has not been added to any replica) a resolved promise with [[CommitZero]] constant will be returned.
         */
        async commitAsync(arg) {
            const graph = this.graph;
            if (!graph)
                return Promise.resolve(CommitZero);
            return graph.commitAsync(arg);
        }
        /**
         * A [[Field]] instance, representing the "meta" information about the class field. It is shared among all identifiers of the certain field
         * in the class.
         */
        static getField(name) {
            return this.getEntity().getField(name);
        }
        /**
         * An [[EntityMeta]] instance, representing the "meta" information about the entity class. It is shared among all instances
         * of the class.
         */
        static getEntity() {
            return ensureEntityOnPrototype(this.prototype);
        }
        static getIdentifierTemplateClass(me, field) {
            const name = field.name;
            const config = {
                name: `${me.$$.name}.$.${name}`,
                field: field
            };
            //------------------
            if (field.hasOwnProperty('sync'))
                config.sync = field.sync;
            if (field.hasOwnProperty('lazy'))
                config.lazy = field.lazy;
            if (field.hasOwnProperty('equality'))
                config.equality = field.equality;
            //------------------
            const calculationFunction = me.$calculations && me[me.$calculations[name]];
            if (calculationFunction)
                config.calculation = calculationFunction;
            //------------------
            const writeFunction = me.$writes && me[me.$writes[name]];
            if (writeFunction)
                config.write = writeFunction;
            //------------------
            const buildProposedFunction = me.$buildProposed && me[me.$buildProposed[name]];
            if (buildProposedFunction) {
                config.buildProposedValue = buildProposedFunction;
                config.proposedValueIsBuilt = true;
            }
            //------------------
            const template = field.getIdentifierClass(calculationFunction).new(config);
            const TemplateClass = function () { };
            TemplateClass.prototype = template;
            return TemplateClass;
        }
        // unfortunately, the better typing:
        // run <Name extends AllowedNames<this, AnyFunction>> (methodName : Name, ...args : Parameters<this[ Name ]>)
        //     : ReturnType<this[ Name ]> extends CalculationIterator<infer Res> ? Res : ReturnType<this[ Name ]>
        // yields "types are exceedingly long and possibly infinite on the application side
        // TODO file a TS bug report
        run(methodName, ...args) {
            const onEffect = (effect) => {
                if (effect instanceof Identifier)
                    return this.graph.read(effect);
                throw new Error("Helper methods can not yield effects during computation");
            };
            return runGeneratorSyncWithEffect(onEffect, this[methodName], args, this);
        }
        static createPropertyAccessorsFor(fieldName) {
            // idea is to indicate to the v8, that `propertyKey` is a constant and thus
            // it can optimize access by it
            const propertyKey = fieldName;
            const target = this.prototype;
            Object.defineProperty(target, propertyKey, {
                get: function () {
                    return this.$[propertyKey].getFromGraph(this.graph);
                },
                set: function (value) {
                    this.$[propertyKey].writeToGraph(this.graph, value);
                }
            });
        }
        static createMethodAccessorsFor(fieldName) {
            // idea is to indicate to the v8, that `propertyKey` is a constant and thus
            // it can optimize access by it
            const propertyKey = fieldName;
            const target = this.prototype;
            const getterFnName = `get${uppercaseFirst(propertyKey)}`;
            const setterFnName = `set${uppercaseFirst(propertyKey)}`;
            const putterFnName = `put${uppercaseFirst(propertyKey)}`;
            if (!(getterFnName in target)) {
                target[getterFnName] = function () {
                    return this.$[propertyKey].getFromGraph(this.graph);
                };
            }
            if (!(setterFnName in target)) {
                target[setterFnName] = function (value, ...args) {
                    this.$[propertyKey].writeToGraph(this.graph, value, ...args);
                    return this.graph
                        ?
                            (this.graph.autoCommitMode === 'sync' ? this.graph.commit() : this.graph.commitAsync())
                        :
                            Promise.resolve(CommitZero);
                };
            }
            if (!(putterFnName in target)) {
                target[putterFnName] = function (value, ...args) {
                    this.$[propertyKey].writeToGraph(this.graph, value, ...args);
                };
            }
        }
    }
    return Entity;
}) {
}
//---------------------------------------------------------------------------------------------------------------------
export const createEntityOnPrototype = (proto) => {
    let parent = Object.getPrototypeOf(proto);
    // the `hasOwnProperty` condition will be `true` for the `Entity` mixin itself
    // if the parent is `Entity` mixin, then this is a top-level entity
    return defineProperty(proto, '$entity', EntityMeta.new({
        parentEntity: parent.hasOwnProperty(isEntityMarker) ? null : parent.$entity,
        name: proto.constructor.name
    }));
};
//---------------------------------------------------------------------------------------------------------------------
export const ensureEntityOnPrototype = (proto) => {
    let entity = proto.$entity;
    if (!proto.hasOwnProperty('$entity'))
        entity = createEntityOnPrototype(proto);
    return entity;
};
/*
 * The "generic" field decorator, in the sense, that it allows specifying both field config and field class.
 * This means it can create any field instance.
 */
export const generic_field = (fieldConfig, fieldCls = Field) => {
    return function (target, fieldName) {
        const entity = ensureEntityOnPrototype(target);
        const field = entity.addField(fieldCls.new(Object.assign(fieldConfig || {}, {
            name: fieldName
        })));
        const cons = target.constructor;
        cons.createPropertyAccessorsFor(fieldName);
        cons.createMethodAccessorsFor(fieldName);
    };
};
//---------------------------------------------------------------------------------------------------------------------
/**
 * Field decorator. The type signature is:
 *
 * ```ts
 * field : <T extends typeof Field = typeof Field> (fieldConfig? : Partial<InstanceType<T>>, fieldCls : T | typeof Field = Field) => PropertyDecorator
 * ```
 * Its a function, that accepts field config object and optionally a field class (default is [[Field]]) and returns a property decorator.
 *
 * Example:
 *
 * ```ts
 * const ignoreCaseCompare = (a : string, b : string) : boolean => a.toUpperCase() === b.toUpperCase()
 *
 * class MyField extends Field {}
 *
 * class Author extends Entity.mix(Base) {
 *     @field({ equality : ignoreCaseCompare })
 *     firstName       : string
 *
 *     @field({ lazy : true }, MyField)
 *     lastName       : string
 * }
 * ```
 *
 * For every field, there are generated get and set accessors, with which you can read/write the data:
 *
 * ```ts
 * const author     = Author.new({ firstName : 'Mark' })
 *
 * author.firstName // Mark
 * author.lastName  = 'Twain'
 * ```
 *
 * The getters are basically using [[Replica.get]] and setters [[Replica.write]].
 *
 * Note, that if the identifier is asynchronous, reading from it will return a promise. But, immediately after the [[Replica.commit]] call, getter will return
 * plain value. This is a compromise between the convenience and correctness and this behavior may change (or made configurable) in the future.
 *
 * Additionally to the accessors, the getter and setter methods are generated. The getter method's name is formed as `get` followed by the field name
 * with upper-cased first letter. The setter's name is formed in the same way, with `set` prefix.
 *
 * The getter method is an exact equivalent of the get accessor. The setter method, in addition to data write, immediately after that
 * performs a call to [[Replica.commit]] (or [[Replica.commitAsync]], depending from the [[Replica.autoCommitMode]] option)
 * and return its result.
 *
 * ```ts
 * const author     = Author.new({ firstName : 'Mark' })
 *
 * author.getFirstName() // Mark
 * await author.setLastName('Twain') // issues asynchronous commit
 * ```
 */
export const field = generic_field;
//---------------------------------------------------------------------------------------------------------------------
/**
 * Decorator for the method, that calculates a value of some field
 *
 * ```ts
 * class Author extends Entity.mix(Base) {
 *     @field()
 *     firstName       : string
 *     @field()
 *     lastName        : string
 *     @field()
 *     fullName        : string
 *
 *     @calculate('fullName')
 *     calculateFullName () : string {
 *         return this.firstName + ' ' + this.lastName
 *     }
 * }
 * ```
 *
 * @param fieldName The name of the field the decorated method should be "tied" to.
 */
export const calculate = function (fieldName) {
    // `target` will be a prototype of the class with Entity mixin
    return function (target, propertyKey, _descriptor) {
        let calculations = target.$calculations;
        if (!calculations)
            calculations = target.$calculations = {};
        calculations[fieldName] = propertyKey;
    };
};
//---------------------------------------------------------------------------------------------------------------------
export const write = function (fieldName) {
    // `target` will be a prototype of the class with Entity mixin
    return function (target, propertyKey, _descriptor) {
        let writes = target.$writes;
        if (!writes)
            writes = target.$writes = {};
        writes[fieldName] = propertyKey;
    };
};
//---------------------------------------------------------------------------------------------------------------------
export const build_proposed = function (fieldName) {
    // `target` will be a prototype of the class with Entity mixin
    return function (target, propertyKey, _descriptor) {
        let buildProposed = target.$buildProposed;
        if (!buildProposed)
            buildProposed = target.$buildProposed = {};
        buildProposed[fieldName] = propertyKey;
    };
};
