import { CommitResult, CommitZero } from "../chrono/Checkout.js"
import { ChronoGraph } from "../chrono/Graph.js"
import { Identifier } from "../chrono/Identifier.js"
import { SyncEffectHandler, YieldableValue } from "../chrono/Transaction.js"
import { instanceOf } from "../class/InstanceOf.js"
import { AnyConstructor, Mixin, MixinConstructor } from "../class/Mixin.js"
import { DEBUG, debug, SourceLinePoint } from "../environment/Debug.js"
import { CalculationIterator, runGeneratorSyncWithEffect } from "../primitives/Calculation.js"
import { EntityMeta } from "../schema/EntityMeta.js"
import { Field, Name } from "../schema/Field.js"
import { defineProperty, uppercaseFirst } from "../util/Helpers.js"
import { EntityIdentifierI, FieldIdentifier, FieldIdentifierI, MinimalEntityIdentifier } from "./Identifier.js"


const isEntityMarker      = Symbol('isEntity')

//---------------------------------------------------------------------------------------------------------------------
export const Entity = instanceOf(<T extends AnyConstructor<object>>(base : T) => {

    class Entity extends base {
        // marker in the prototype to identify whether the parent class is Entity mixin itself
        [isEntityMarker] () {}

        $calculations   : { [s in keyof this] : string }
        $writes         : { [s in keyof this] : string }
        $buildProposed  : { [s in keyof this] : string }

        static $skeleton       : object = {}

        graph           : ChronoGraph

        // lazy meta instance creation - will work even w/o any @field or @entity decorator
        get $entity () : EntityMeta {
            // this will lazily create an EntityData instance in the prototype
            return createEntityOnPrototype(this.constructor.prototype)
        }


        get $ () : { [s in keyof this] : FieldIdentifierI } {
            const $ = {}

            this.$entity.forEachField((field, name) => {
                $[ name ]   = this.createFieldIdentifier(field)
            })

            if (DEBUG) {
                const proxy = new Proxy($, {
                    get (entity : Entity, property : string | number | symbol, receiver : any) : any {
                        if (!entity[ property ]) debug(new Error(`Attempt to read a missing field ${String(property)} on ${entity}`))

                        entity[ property ].SOURCE_POINT = SourceLinePoint.fromCurrentCall()

                        return entity[ property ]
                    }
                })

                return defineProperty(this as any, '$', proxy)
            } else {
                return defineProperty(this as any, '$', $)
            }
        }


        get $$ () : EntityIdentifierI {
            return defineProperty(this, '$$', MinimalEntityIdentifier.new({
                name                : this.$entity.name,
                entity              : this.$entity,

                calculation         : this.calculateSelf,

                context             : this,
                self                : this,
            }))
        }


        * calculateSelf () : CalculationIterator<this> {
            return this
        }


        createFieldIdentifier (field : Field) : FieldIdentifierI {
            const name                  = field.name
            const constructor           = this.constructor as EntityConstructor
            const skeleton              = constructor.$skeleton

            if (!skeleton[ name ]) skeleton[ name ] = constructor.getIdentifierTemplateClass(this, field)

            const identifier            = new skeleton[ name ]()

            identifier.context          = this
            identifier.self             = this

            return identifier
        }


        forEachFieldIdentifier<T extends this> (func : (field : FieldIdentifierI, name : string) => any) {
            this.$entity.forEachField((field, name) => func(this.$[ name ], name))
        }


        enterGraph (replica : ChronoGraph) {
            if (this.graph) throw new Error('Already entered replica')

            this.graph      = replica

            replica.addIdentifier(this.$$)

            this.$entity.forEachField((field, name) => {
                const identifier : FieldIdentifier   = this.$[ name ]

                replica.addIdentifier(identifier, identifier.DATA)

                identifier.DATA = undefined
            })
        }


        leaveGraph () {
            const graph     = this.graph
            if (!graph) return

            this.$entity.forEachField((field, name) => graph.removeIdentifier(this.$[ name ]))

            graph.removeIdentifier(this.$$)

            this.graph      = undefined
        }


        // isPropagating () {
        //     return this.getGraph().isPropagating
        // }


        propagate () : CommitResult {
            return this.commit()
        }


        commit () : CommitResult {
            const graph     = this.graph

            if (!graph) return

            return graph.commit()
        }


        async propagateAsync () : Promise<CommitResult> {
            return this.commitAsync()
        }


        async commitAsync () : Promise<CommitResult> {
            const graph     = this.graph

            if (!graph) return Promise.resolve(CommitZero)

            return graph.commitAsync()
        }


        // propagateSync () : PropagateResult {
        //     const graph     = this.graph
        //
        //     if (!graph) return
        //
        //     return graph.propagateSync()
        // }

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


        static getEntity () : EntityMeta {
            return ensureEntityOnPrototype(this.prototype)
        }


        static getIdentifierTemplateClass (me : Entity, field : Field) : typeof Identifier {
            const name                  = field.name

            const config : Partial<FieldIdentifierI> = {
                name                : `${me.$$.name}/${name}`,
                field               : field,
                lazy                : field.lazy,
                sync                : field.sync
            }

            //------------------
            if (field.equality) config.equality = field.equality

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
    }

    return Entity
})

export type Entity = Mixin<typeof Entity>

export type EntityConstructor = MixinConstructor<typeof Entity>


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
            const entity    = ensureEntityOnPrototype(target)

            const field     = entity.addField(
                fieldCls.new(Object.assign(fieldConfig || {}, {
                    name    : propertyKey
                }))
            )

            Object.defineProperty(target, propertyKey, {
                get     : function (this : Entity) : any {
                    return (this.$[ propertyKey ] as FieldIdentifier).getFromGraph(this.graph)
                },

                set     : function (this : Entity, value : any) {
                    (this.$[ propertyKey ] as FieldIdentifier).writeToGraph(this.graph, value)
                }
            })

            const getterFnName = `get${ uppercaseFirst(propertyKey) }`
            const setterFnName = `set${ uppercaseFirst(propertyKey) }`
            const putterFnName = `put${ uppercaseFirst(propertyKey) }`

            if (!(getterFnName in target)) {
                target[ getterFnName ] = function (this : Entity) : any {
                    return (this.$[ propertyKey ] as FieldIdentifier).getFromGraph(this.graph)
                }
            }

            if (!(setterFnName in target)) {
                target[ setterFnName ] = function (this : Entity, value : any, ...args) : Promise<CommitResult> {
                    (this.$[ propertyKey ] as FieldIdentifier).writeToGraph(this.graph, value, ...args)

                    return this.graph ? this.graph.commitAsync() : Promise.resolve(CommitZero)
                }
            }

            if (!(putterFnName in target)) {
                target[ putterFnName ] = function (this : Entity, value : any, ...args) : any {
                    (this.$[ propertyKey ] as FieldIdentifier).writeToGraph(this.graph, value, ...args)
                }
            }
        }
    }


//---------------------------------------------------------------------------------------------------------------------
export const field : typeof generic_field = generic_field


//---------------------------------------------------------------------------------------------------------------------
export const calculate = function (fieldName : Name) : MethodDecorator {

    // `target` will be a prototype of the class with Entity mixin
    return function (target : Entity, propertyKey : string, _descriptor : TypedPropertyDescriptor<any>) : void {
        let calculations        = target.$calculations

        if (!calculations) calculations = target.$calculations = {} as any

        calculations[ fieldName ]       = propertyKey
    }
}


//---------------------------------------------------------------------------------------------------------------------
export const write = function (fieldName : Name) : MethodDecorator {

    // `target` will be a prototype of the class with Entity mixin
    return function (target : Entity, propertyKey : string, _descriptor : TypedPropertyDescriptor<any>) : void {
        let writes              = target.$writes

        if (!writes) writes = target.$writes = {} as any

        writes[ fieldName ]     = propertyKey
    }
}


//---------------------------------------------------------------------------------------------------------------------
export const build_proposed = function (fieldName : Name) : MethodDecorator {

    // `target` will be a prototype of the class with Entity mixin
    return function (target : Entity, propertyKey : string, _descriptor : TypedPropertyDescriptor<any>) : void {
        let buildProposed       = target.$buildProposed

        if (!buildProposed) buildProposed = target.$buildProposed = {} as any

        buildProposed[ fieldName ]     = propertyKey
    }
}


//---------------------------------------------------------------------------------------------------------------------
export const getSourcePointFromIdentifier = (identifier : Identifier) : SourceLinePoint => {
    return (identifier as any).SOURCE_POINT
}
