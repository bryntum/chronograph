import { CalculatedValueGen, CalculatedValueSync, Identifier } from "../chrono/Identifier.js"
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
    field       : Field

    self        : Entity

    // temp storage for value for the phase, when identifier is created, but has not joined any graph
    // is cleared during the 1st join to the graph
    DATA        : this[ 'ValueT' ]

    // put (proposedValue : ChronoValue, ...args) {
    //     return super.put(this.field.converter ? this.field.converter(proposedValue, this.field) : proposedValue, ...args)
    // }


    toString () : string {
        return `Field identifier [${ this.field.name }] of entity [${ this.self }]`
    }
})

export type FieldIdentifier = Mixin<typeof FieldIdentifier>

export type FieldIdentifierConstructor  = MixinConstructor<typeof FieldIdentifier>

export interface FieldIdentifierI extends FieldIdentifier {}


export class MinimalFieldIdentifier extends FieldIdentifier(CalculatedValueGen) {}



//---------------------------------------------------------------------------------------------------------------------
export const EntityIdentifier = <T extends AnyConstructor<CalculatedValueSync>>(base : T) =>

class EntityIdentifier extends base implements PartOfEntityIdentifier {
    entity      : EntityMeta

    self        : Entity


    toString () : string {
        return `Entity identifier [${ this.self }]`
    }
}

export type EntityIdentifier = Mixin<typeof EntityIdentifier>

export interface EntityIdentifierI extends EntityIdentifier {}


export class MinimalEntityIdentifier extends EntityIdentifier(CalculatedValueSync) {}
