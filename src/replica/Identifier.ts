import { CheckoutI } from "../chrono/Checkout.js"
import { CalculatedValueGen, CalculatedValueSync, Identifier, Variable } from "../chrono/Identifier.js"
import { instanceOf } from "../class/InstanceOf.js"
import { AnyConstructor, Mixin, MixinConstructor } from "../class/Mixin.js"
import { EntityMeta } from "../schema/EntityMeta.js"
import { Field } from "../schema/Field.js"
import { Entity } from "./Entity.js"


export interface PartOfEntityIdentifier {
    self        : Entity
}


//---------------------------------------------------------------------------------------------------------------------
export const FieldIdentifier = instanceOf(<T extends AnyConstructor<Identifier>>(base : T) =>

class FieldIdentifier extends base implements PartOfEntityIdentifier {
    field       : Field             = undefined

    self        : Entity            = undefined

    // temp storage for value for the phase, when identifier is created, but has not joined any graph
    // is cleared during the 1st join to the graph
    DATA        : this[ 'ValueT' ]  = undefined

    // standaloneQuark     : InstanceType<this[ 'quarkClass' ]>


    // readFromGraphDirtySync (graph : CheckoutI) {
    //     if (graph)
    //         return graph.readDirty(this)
    //     else
    //         return this.DATA
    // }


    readFromGraph (graph : CheckoutI) : this[ 'ValueT' ] {
        if (graph)
            return graph.read(this)
        else
            return this.DATA
    }


    writeToGraph (graph : CheckoutI, proposedValue : this[ 'ValueT' ], ...args : this[ 'ArgsT' ]) {
        if (graph)
            graph.write(this, proposedValue, ...args)
        else
            this.DATA = proposedValue
    }


    toString () : string {
        return `[${ this.field.name }] of [${ this.self }]`
    }
})

export type FieldIdentifier = Mixin<typeof FieldIdentifier>

export type FieldIdentifierConstructor  = MixinConstructor<typeof FieldIdentifier>

export interface FieldIdentifierI extends FieldIdentifier {}


export class MinimalFieldIdentifierSync extends FieldIdentifier(CalculatedValueSync) {}
export class MinimalFieldIdentifierGen extends FieldIdentifier(CalculatedValueGen) {}
export class MinimalFieldVariable extends FieldIdentifier(Variable) {}


//---------------------------------------------------------------------------------------------------------------------
export const EntityIdentifier = <T extends AnyConstructor<Identifier>>(base : T) =>

class EntityIdentifier extends base implements PartOfEntityIdentifier {
    entity      : EntityMeta        = undefined

    self        : Entity            = undefined


    // entity atom is considered changed if any of its incoming atoms has changed
    // this just means if it's calculation method has been called, it should always
    // assign a new value
    equality () : boolean {
        return false
    }


    toString () : string {
        return `Entity identifier [${ this.self }]`
    }
}

export type EntityIdentifier = Mixin<typeof EntityIdentifier>

export interface EntityIdentifierI extends EntityIdentifier {}


export class MinimalEntityIdentifier extends EntityIdentifier(CalculatedValueGen) {}
