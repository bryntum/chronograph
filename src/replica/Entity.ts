import { PropagateResult } from "../chrono/Checkout.js"
import { ChronoGraph } from "../chrono/Graph.js"
import { Identifier } from "../chrono/Identifier.js"
import { SyncEffectHandler, YieldableValue } from "../chrono/Transaction.js"
import { instanceOf } from "../class/InstanceOf.js"
import { AnyConstructor, Mixin } from "../class/Mixin.js"
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

        graph           : ChronoGraph

        // lazy meta instance creation - will work even w/o any @field or @entity decorator
        get $entity () : EntityMeta {
            // this will lazily create an EntityData instance in the prototype
            return createEntityOnPrototype(this.constructor.prototype)
        }


        get $ () : { [s in keyof this] : FieldIdentifierI } {
            // TODO
            // // the individual identifiers are populated lazily
            // return defineProperty(this as any, '$', new this.$entity.skeletonClass(this))

            const $ = {}

            this.$entity.forEachField((field, name) => {
                $[ name ]   = this.createFieldIdentifier(field)
            })

            this.$entity.forEachField((field, name) => {
                if (field.listeners) {
                    let listeners     = $[ name ].listeners

                    if (!listeners) listeners = $[ name ].listeners = new Set()

                    field.listeners.forEach(name => listeners.add($[ name ]))
                }

                if (field.listens) {
                    field.listens.forEach(name => {
                        let listeners     = $[ name ].listeners

                        if (!listeners) listeners = $[ name ].listeners = new Set()

                        listeners.add($[ name ])
                    })
                }

            })

            return defineProperty(this as any, '$', $)
        }


        get $$ () : EntityIdentifierI {
            return defineProperty(this, '$$', MinimalEntityIdentifier.new({
                name                : this.$entity.name,
                entity              : this.$entity,

                self                : this,

                // entity atom is considered changed if any of its incoming atoms has changed
                // this just means if it's calculation method has been called, it should always
                // assign a new value
                equality            : () => false,

                calculation         : this.calculateSelf,
                context             : this
            }))
        }


        * calculateSelf () : CalculationIterator<this> {
            return this
        }


        createFieldIdentifier (field : Field) : FieldIdentifierI {
            const name                  = field.name

            const config : Partial<FieldIdentifierI> = {
                name                : `${this.$$.name}/${name}`,
                field               : field,
                self                : this,
                context             : this,
                lazy                : field.lazy
            }

            //------------------
            if (field.equality) config.equality = field.equality

            //------------------
            const calculationFunction   = this.$calculations && this[ this.$calculations[ name ] ]

            if (calculationFunction) config.calculation = calculationFunction

            //------------------
            const writeFunction         = this.$writes && this[ this.$writes[ name ] ]

            if (writeFunction) config.write = writeFunction

            //------------------
            const buildProposedFunction = this.$buildProposed && this[ this.$buildProposed[ name ] ]

            if (buildProposedFunction) config.buildProposedValue = buildProposedFunction

            //------------------
            return field.identifierCls.new(config)
        }


        forEachFieldAtom<T extends this> (func : (field : FieldIdentifierI, name : keyof T) => any) {
            const keys  = Object.keys(this.$) as (keyof this)[]

            // only the already created identifiers will be added
            for (let i = 0; i < keys.length; i++) {
                const name                          = keys[ i ]
                const identifier : FieldIdentifier  = this.$[ name ]

                func(identifier, name)
            }
        }


        enterGraph (replica : ChronoGraph) {
            if (this.graph) throw new Error('Already entered replica')

            this.graph        = replica

            replica.addIdentifier(this.$$)

            const keys  = Object.keys(this.$)

            // only the already created identifiers will be added
            for (let i = 0; i < keys.length; i++) {
                const identifier : FieldIdentifier   = this.$[ keys[ i ] ]

                replica.addIdentifier(identifier)

                if (identifier.DATA !== undefined) {
                    replica.write(identifier, identifier.DATA)
                    identifier.DATA = undefined
                }
            }
        }


        leaveGraph () {
            const graph     = this.graph
            if (!graph) return
            this.graph      = undefined

            const keys  = Object.keys(this.$)

            // only the already created identifiers will be added
            for (let i = 0; i < keys.length; i++) {
                graph.removeIdentifier(this.$[ keys[ i ] ])
            }

            graph.removeIdentifier(this.$$)
        }


        // isPropagating () {
        //     return this.getGraph().isPropagating
        // }


        propagate () : PropagateResult {
            const graph     = this.graph

            if (!graph) return

            return graph.propagate()
        }


        async propagateAsync () : Promise<PropagateResult> {
            const graph     = this.graph

            if (!graph) return

            return graph.propagateAsync()
        }


        propagateSync () : PropagateResult {
            const graph     = this.graph

            if (!graph) return

            return graph.propagateSync()
        }

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


//---------------------------------------------------------------------------------------------------------------------
export const createEntityOnPrototype = (proto : any) : EntityMeta => {
    let parent      = Object.getPrototypeOf(proto)

    // the `hasOwnProperty` condition will be `true` for the `Entity` mixin itself
    // if the parent is `Entity` mixin, then this is a top-level entity
    return defineProperty(proto, '$entity', EntityMeta.new({ parentEntity : parent.hasOwnProperty(isEntityMarker) ? null : parent.$entity }))
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
                get     : function (this : Entity) {
                    if (this.graph) {
                        return this.graph.readDirty(this.$[ propertyKey ])
                    } else {
                        return this.$[ propertyKey ].DATA
                    }
                },

                set     : function (this : Entity, value : any) {
                    if (this.graph) {
                        return this.graph.write(this.$[ propertyKey ], value)
                    } else {
                        this.$[ propertyKey ].DATA = value
                    }
                }
            })

            const getterFnName = `get${ uppercaseFirst(propertyKey) }`
            const setterFnName = `set${ uppercaseFirst(propertyKey) }`
            const putterFnName = `put${ uppercaseFirst(propertyKey) }`

            if (!(getterFnName in target)) {
                target[ getterFnName ] = function (this : Entity) : any {
                    if (this.graph) {
                        return this.graph.readDirty(this.$[ propertyKey ])
                    } else {
                        return this.$[ propertyKey ].DATA
                    }
                }
            }

            if (!(setterFnName in target)) {
                target[ setterFnName ] = function (this : Entity, value : any, ...args) : any {
                    if (this.graph) {
                        this.graph.write(this.$[ propertyKey ], value, ...args)

                        return this.graph.propagateAsync()
                    } else {
                        this.$[ propertyKey ].DATA = value
                    }
                }
            }

            if (!(putterFnName in target)) {
                target[ putterFnName ] = function (this : Entity, value : any, ...args) : any {
                    if (this.graph) {
                        this.graph.write(this.$[ propertyKey ], value, ...args)
                    } else {
                        this.$[ propertyKey ].DATA = value
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

