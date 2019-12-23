import { CalculatedValueGen, Identifier } from "../chrono/Identifier.js"
import { AnyConstructor, Mixin } from "../class/BetterMixin.js"
import { EntityMeta } from "../schema/EntityMeta.js"
import { Field } from "../schema/Field.js"
import { Entity } from "./Entity.js"


export interface PartOfEntityIdentifier {
    self        : Entity
}


//---------------------------------------------------------------------------------------------------------------------
export class FieldIdentifier extends Mixin(
    [ Identifier ],
    <T extends AnyConstructor<Identifier>>(base : T) =>

class FieldIdentifier extends base implements PartOfEntityIdentifier {
    field       : Field             = undefined

    self        : Entity            = undefined

    // temp storage for value for the phase, when identifier is created, but has not joined any graph
    // is cleared during the 1st join to the graph
    DATA        : this[ 'ValueT' ]  = undefined

    // standaloneQuark     : InstanceType<this[ 'quarkClass' ]>

    // put (proposedValue : ChronoValue, ...args) {
    //     return super.put(this.field.converter ? this.field.converter(proposedValue, this.field) : proposedValue, ...args)
    // }


    toString () : string {
        return `[${ this.field.name }] of [${ this.self }]`
    }
}){}

export type FieldIdentifierConstructor  = typeof FieldIdentifier

export class MinimalFieldIdentifier extends FieldIdentifier.mix(CalculatedValueGen) {}



//---------------------------------------------------------------------------------------------------------------------
export class EntityIdentifier extends Mixin(
    [ Identifier ],
    <T extends AnyConstructor<Identifier>>(base : T) =>

class EntityIdentifier extends base implements PartOfEntityIdentifier {
    entity      : EntityMeta        = undefined

    self        : Entity            = undefined


    toString () : string {
        return `Entity identifier [${ this.self }]`
    }
}){}

export class MinimalEntityIdentifier extends EntityIdentifier.mix(CalculatedValueGen) {}
