import { ChronoGraph, CommitArguments, CommitResult, CommitZero } from "../chrono/Graph.js"
import { Identifier } from "../chrono/Identifier.js"
import { SyncEffectHandler, YieldableValue } from "../chrono/Transaction.js"
import { AnyConstructor, Mixin } from "../class/Mixin.js"
import { DEBUG, debug, DEBUG_ONLY, SourceLinePoint } from "../environment/Debug.js"
import { CalculationIterator, runGeneratorSyncWithEffect } from "../primitives/Calculation.js"
import { EntityMeta } from "../schema/EntityMeta.js"
import { Field, Name } from "../schema/Field.js"
import { defineProperty, uppercaseFirst } from "../util/Helpers.js"
import { EntityIdentifier, FieldIdentifier, MinimalEntityIdentifier } from "./Identifier.js"
import { Replica } from "./Replica.js"


const isEntityMarker      = Symbol('isEntity')

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
export class Entity extends Mixin(
    [],
    (base : AnyConstructor) => {

    class Entity extends base {
        // marker in the prototype to identify whether the parent class is Entity mixin itself
        // it is not used for `instanceof` purposes and not be confused with the [MixinInstanceOfProperty]
        // (though it is possible to use MixinInstanceOfProperty for this purpose, that would require to
        // make it public
        [isEntityMarker] () {}

        $calculations   : { [s in keyof this] : string }
        $writes         : { [s in keyof this] : string }
        $buildProposed  : { [s in keyof this] : string }

        /**
         * A reference to the graph, this entity belongs to. Initially empty, and is populated when the entity instance
         * is added to the replica ([[Replica.addEntity]])
         */
        graph           : Replica

        /**
         * An [[EntityMeta]] instance, representing the "meta" information about the entity class. It is shared among all instances
         * of the class.
         */
        get $entity () : EntityMeta {
            // this will lazily create an EntityData instance in the prototype
            return createEntityOnPrototype(this.constructor.prototype)
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
        get $ () : { [s in keyof this] : FieldIdentifier } {
            const $ = {}

            this.$entity.forEachField((field, name) => {
                $[ name ]   = this.createFieldIdentifier(field)
            })

            if (DEBUG) {
                const proxy = new Proxy($, {
                    get (entity : Entity, property : string | number | symbol, receiver : any) : any {
                        if (!entity[ property ]) debug(new Error(`Attempt to read a missing field ${String(property)} on ${entity}`))

                        entity[ property ].SOURCE_POINT = SourceLinePoint.fromThisCall()

                        return entity[ property ]
                    }
                })

                return defineProperty(this as any, '$', proxy)
            } else {
                return defineProperty(this as any, '$', $)
            }
        }

        /**
         * A graph identifier, that represents the whole entity.
         */
        get $$ () : EntityIdentifier {
            return defineProperty(this, '$$', MinimalEntityIdentifier.new({
                name                : this.$entityName,
                entity              : this.$entity,

                calculation         : this.calculateSelf,

                context             : this,
                self                : this,
            }))
        }


        get $entityName () : string {
            return this.constructor.name || this.$entity.name
        }


        * calculateSelf () : CalculationIterator<this> {
            return this
        }


        createFieldIdentifier (field : Field) : FieldIdentifier {
            const name                  = field.name
            const entity                = this.$entity
            const constructor           = this.constructor as EntityConstructor
            const skeleton              = entity.$skeleton

            if (!skeleton[ name ]) skeleton[ name ] = constructor.getIdentifierTemplateClass(this, field)

            const identifier            = new skeleton[ name ]()

            identifier.context          = this
            identifier.self             = this
            identifier.name             = `${this.$$.name}.$.${field.name}`

            return identifier
        }


        forEachFieldIdentifier<T extends this> (func : (field : FieldIdentifier, name : string) => any) {
            this.$entity.forEachField((field, name) => func(this.$[ name ], name))
        }


        /**
         * This method is called when entity is added to some replica.
         *
         * @param replica
         */
        enterGraph (replica : Replica) {
            if (this.graph) throw new Error('Already entered replica')

            this.graph      = replica

            replica.addIdentifier(this.$$)

            this.$entity.forEachField((field, name) => {
                const identifier : FieldIdentifier   = this.$[ name ]

                replica.addIdentifier(identifier, identifier.DATA)

                identifier.DATA = undefined
            })
        }


        /**
         * This method is called when entity is removed from the replica it's been added to.
         */
        leaveGraph (graph : Replica) {
            const ownGraph      = this.graph
            const removeFrom    = graph || ownGraph

            if (!removeFrom) return

            this.$entity.forEachField((field, name) => removeFrom.removeIdentifier(this.$[ name ]))

            removeFrom.removeIdentifier(this.$$)

            if (removeFrom === ownGraph) this.graph      = undefined
        }


        // isPropagating () {
        //     return this.getGraph().isPropagating
        // }


        propagate (arg? : CommitArguments) : CommitResult {
            return this.commit(arg)
        }


        /**
         * This is a convenience method, that just delegates to the [[ChronoGraph.commit]] method of this entity's graph.
         *
         * If there's no graph (entity has not been added to any replica) a [[CommitZero]] constant will be returned.
         */
        commit (arg? : CommitArguments) : CommitResult {
            const graph     = this.graph

            if (!graph) return CommitZero

            return graph.commit(arg)
        }


        async propagateAsync () : Promise<CommitResult> {
            return this.commitAsync()
        }


        /**
         * This is a convenience method, that just delegates to the [[ChronoGraph.commitAsync]] method of this entity's graph.
         *
         * If there's no graph (entity has not been added to any replica) a resolved promise with [[CommitZero]] constant will be returned.
         */
        async commitAsync (arg? : CommitArguments) : Promise<CommitResult> {
            const graph     = this.graph

            if (!graph) return Promise.resolve(CommitZero)

            return graph.commitAsync(arg)
        }


        /**
         * An [[EntityMeta]] instance, representing the "meta" information about the entity class. It is shared among all instances
         * of the class.
         */
        static get $entity () : EntityMeta {
            return ensureEntityOnPrototype(this.prototype)
        }


        static getIdentifierTemplateClass (me : Entity, field : Field) : typeof Identifier {
            const name                  = field.name

            const config : Partial<FieldIdentifier> = {
                name                : `${me.$$.name}.$.${name}`,
                field               : field
            }

            //------------------
            if (field.hasOwnProperty('sync')) config.sync = field.sync
            if (field.hasOwnProperty('lazy')) config.lazy = field.lazy
            if (field.hasOwnProperty('equality')) config.equality = field.equality

            //------------------
            const calculationFunction   = me.$calculations && me[ me.$calculations[ name ] ]

            if (calculationFunction) config.calculation = calculationFunction

            //------------------
            const writeFunction         = me.$writes && me[ me.$writes[ name ] ]

            if (writeFunction) config.write = writeFunction

            //------------------
            const buildProposedFunction = me.$buildProposed && me[ me.$buildProposed[ name ] ]

            if (buildProposedFunction) {
                config.buildProposedValue       = buildProposedFunction
                config.proposedValueIsBuilt     = true
            }

            //------------------
            const template              = field.getIdentifierClass(calculationFunction).new(config)

            const TemplateClass         = function () {} as any as typeof Identifier

            TemplateClass.prototype     = template

            return TemplateClass
        }


        // unfortunately, the better typing:
        // run <Name extends AllowedNames<this, AnyFunction>> (methodName : Name, ...args : Parameters<this[ Name ]>)
        //     : ReturnType<this[ Name ]> extends CalculationIterator<infer Res> ? Res : ReturnType<this[ Name ]>
        // yields "types are exceedingly long and possibly infinite on the application side
        // TODO file a TS bug report
        run (methodName : keyof this, ...args : any[]) : any {
            const onEffect : SyncEffectHandler = (effect : YieldableValue) => {
                if (effect instanceof Identifier) return this.graph.read(effect)

                throw new Error("Helper methods can not yield effects during computation")
            }

            return runGeneratorSyncWithEffect(onEffect, this[ methodName ] as any, args, this)
        }


        static createPropertyAccessorsFor (fieldName : string) {
            // idea is to indicate to the v8, that `propertyKey` is a constant and thus
            // it can optimize access by it
            const propertyKey   = fieldName
            const target        = this.prototype

            Object.defineProperty(target, propertyKey, {
                get     : function (this : Entity) : any {
                    return (this.$[ propertyKey ] as FieldIdentifier).getFromGraph(this.graph)
                },

                set     : function (this : Entity, value : any) {
                    (this.$[ propertyKey ] as FieldIdentifier).writeToGraph(this.graph, value)
                }
            })
        }


        static createMethodAccessorsFor (fieldName : string) {
            // idea is to indicate to the v8, that `propertyKey` is a constant and thus
            // it can optimize access by it
            const propertyKey   = fieldName
            const target        = this.prototype

            const getterFnName = `get${ uppercaseFirst(propertyKey) }`
            const setterFnName = `set${ uppercaseFirst(propertyKey) }`
            const putterFnName = `put${ uppercaseFirst(propertyKey) }`

            if (!(getterFnName in target)) {
                target[ getterFnName ] = function (this : Entity) : any {
                    return (this.$[ propertyKey ] as FieldIdentifier).getFromGraph(this.graph)
                }
            }

            if (!(setterFnName in target)) {
                target[ setterFnName ] = function (this : Entity, value : any, ...args) : CommitResult | Promise<CommitResult> {
                    (this.$[ propertyKey ] as FieldIdentifier).writeToGraph(this.graph, value, ...args)

                    return this.graph
                        ?
                            (this.graph.autoCommitMode === 'sync' ? this.graph.commit() : this.graph.commitAsync())
                        :
                            Promise.resolve(CommitZero)
                }
            }

            if (!(putterFnName in target)) {
                target[ putterFnName ] = function (this : Entity, value : any, ...args) : any {
                    (this.$[ propertyKey ] as FieldIdentifier).writeToGraph(this.graph, value, ...args)
                }
            }
        }

    }

    return Entity
}){}

export type EntityConstructor = typeof Entity


//---------------------------------------------------------------------------------------------------------------------
export const createEntityOnPrototype = (proto : any) : EntityMeta => {
    let parent      = Object.getPrototypeOf(proto)

    // the `hasOwnProperty` condition will be `true` for the `Entity` mixin itself
    // if the parent is `Entity` mixin, then this is a top-level entity
    return defineProperty(proto, '$entity', EntityMeta.new({
        parentEntity    : parent.hasOwnProperty(isEntityMarker) ? null : parent.$entity,
        name            : proto.constructor.name
    }))
}


//---------------------------------------------------------------------------------------------------------------------
export const ensureEntityOnPrototype = (proto : any) : EntityMeta => {
    if (!proto.hasOwnProperty('$entity')) createEntityOnPrototype(proto)

    return proto.$entity
}


export type FieldDecorator<Default extends AnyConstructor = typeof Field> =
    <T extends Default = Default> (fieldConfig? : Partial<InstanceType<T>>, fieldCls? : T | Default) => PropertyDecorator


/*
 * The "generic" field decorator, in the sense, that it allows specifying both field config and field class.
 * This means it can create any field instance.
 */
export const generic_field : FieldDecorator<typeof Field> =
    <T extends typeof Field = typeof Field> (fieldConfig? : Partial<InstanceType<T>>, fieldCls : T | typeof Field = Field) : PropertyDecorator => {

        return function (target : Entity, fieldName : string) : void {
            const entity        = ensureEntityOnPrototype(target)

            const field         = entity.addField(
                fieldCls.new(Object.assign(fieldConfig || {}, {
                    name    : fieldName
                }))
            )

            const cons          = target.constructor as typeof Entity

            cons.createPropertyAccessorsFor(fieldName)
            cons.createMethodAccessorsFor(fieldName)
        }
    }


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
export const field : typeof generic_field = generic_field


//---------------------------------------------------------------------------------------------------------------------
/**
 * Decorator for the method, that calculates a value of some field
 *
 * ```ts
 *
 * @entity()
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
export const calculate = function (fieldName : Name) : MethodDecorator {

    // `target` will be a prototype of the class with Entity mixin
    return function (target : Entity, propertyKey : string, _descriptor : TypedPropertyDescriptor<any>) : void {
        ensureEntityOnPrototype(target)

        let calculations : Entity[ '$calculations' ]

        if (!target.$calculations) {
            calculations        = target.$calculations = {} as any
        } else {
            if (!target.hasOwnProperty('$calculations')) {
                calculations    = target.$calculations = Object.create(target.$calculations)
            } else
                calculations    = target.$calculations
        }

        calculations[ fieldName ]       = propertyKey
    }
}


//---------------------------------------------------------------------------------------------------------------------
export const write = function (fieldName : Name) : MethodDecorator {

    // `target` will be a prototype of the class with Entity mixin
    return function (target : Entity, propertyKey : string, _descriptor : TypedPropertyDescriptor<any>) : void {
        ensureEntityOnPrototype(target)

        let writes : Entity[ '$writes' ]

        if (!target.$writes) {
            writes        = target.$writes = {} as any
        } else {
            if (!target.hasOwnProperty('$writes')) {
                writes    = target.$writes = Object.create(target.$writes)
            } else
                writes    = target.$writes
        }

        writes[ fieldName ]     = propertyKey
    }
}


//---------------------------------------------------------------------------------------------------------------------
export const build_proposed = function (fieldName : Name) : MethodDecorator {

    // `target` will be a prototype of the class with Entity mixin
    return function (target : Entity, propertyKey : string, _descriptor : TypedPropertyDescriptor<any>) : void {
        ensureEntityOnPrototype(target)

        let buildProposed : Entity[ '$buildProposed' ]

        if (!target.$buildProposed) {
            buildProposed        = target.$buildProposed = {} as any
        } else {
            if (!target.hasOwnProperty('$buildProposed')) {
                buildProposed    = target.$buildProposed = Object.create(target.$buildProposed)
            } else
                buildProposed    = target.$buildProposed
        }

        buildProposed[ fieldName ]     = propertyKey
    }
}
