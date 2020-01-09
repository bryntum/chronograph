import { Checkout } from "../chrono/Checkout.js"
import { CalculatedValueGen, CalculatedValueSync, Identifier, Variable } from "../chrono/Identifier.js"
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


    // readFromGraphDirtySync (graph : Checkout) {
    //     if (graph)
    //         return graph.readDirty(this)
    //     else
    //         return this.DATA
    // }


    readFromGraph (graph : Checkout) : this[ 'ValueT' ] {
        if (graph)
            return graph.read(this)
        else
            return this.DATA
    }


    writeToGraph (graph : Checkout, proposedValue : this[ 'ValueT' ], ...args : this[ 'ArgsT' ]) {
        if (graph)
            graph.write(this, proposedValue, ...args)
        else
            this.DATA = proposedValue
    }


    toString () : string {
        return `[${ this.field.name }] of [${ this.self }]`
    }
}){}

export type FieldIdentifierConstructor  = typeof FieldIdentifier

export class MinimalFieldIdentifierSync extends FieldIdentifier.mix(CalculatedValueSync) {}
export class MinimalFieldIdentifierGen extends FieldIdentifier.mix(CalculatedValueGen) {}
export class MinimalFieldVariable extends FieldIdentifier.mix(Variable) {}


//---------------------------------------------------------------------------------------------------------------------
export class EntityIdentifier extends Mixin(
    [ Identifier ],
    <T extends AnyConstructor<Identifier>>(base : T) =>

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
}){}

export class MinimalEntityIdentifier extends EntityIdentifier.mix(CalculatedValueGen) {}
