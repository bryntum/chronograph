import { CheckoutI } from "../chrono/Checkout.js"
import { Identifier } from "../chrono/Identifier.js"
import { MinimalQuark, Quark, QuarkConstructor } from "../chrono/Quark.js"
import { ProposedOrCurrent } from "../chrono/Transaction.js"
import { AnyConstructor, Mixin } from "../class/Mixin.js"
import { CalculationIterator } from "../primitives/Calculation.js"
import { Field } from "../schema/Field.js"
import { defineProperty } from "../util/Helpers.js"
import { Entity, FieldDecorator, generic_field } from "./Entity.js"
import { FieldIdentifier, FieldIdentifierConstructor, MinimalFieldIdentifier } from "./Identifier.js"

//---------------------------------------------------------------------------------------------------------------------
export const ReferenceBucketField = <T extends AnyConstructor<Field>>(base : T) =>

class ReferenceBucketField extends base {
    persistent          : boolean   = false

    identifierCls       : FieldIdentifierConstructor    = MinimalReferenceBucketIdentifier
}

export type ReferenceBucketField = Mixin<typeof ReferenceBucketField>


export class MinimalReferenceBucketField extends ReferenceBucketField(Field) {}

//---------------------------------------------------------------------------------------------------------------------
export const bucket : FieldDecorator<typeof MinimalReferenceBucketField> =
    (fieldConfig?, fieldCls = MinimalReferenceBucketField) => generic_field(fieldConfig, fieldCls)


//---------------------------------------------------------------------------------------------------------------------
export const ReferenceBucketIdentifier = <T extends AnyConstructor<FieldIdentifier>>(base : T) =>

class ReferenceBucketIdentifier extends base {
    ValueT              : Set<Entity>

    quarkClass          : QuarkConstructor      = MinimalReferenceBucketQuark


    addToBucket (graph : CheckoutI, entity : Entity) {
        const quark         = graph.acquireQuark(this) as ReferenceBucketQuark

        if (!quark.newRefs) quark.newRefs = new Set()

        if (!quark.previousValue && graph.hasIdentifier(this)) quark.previousValue = graph.read(this)

        quark.newRefs.add(entity)
    }


    removeFromBucket (graph : CheckoutI, entity : Entity) {
        const quark         = graph.acquireQuark(this) as ReferenceBucketQuark

        if (!quark.oldRefs) quark.oldRefs = new Set()

        if (!quark.previousValue && graph.hasIdentifier(this)) quark.previousValue = graph.read(this)

        quark.oldRefs.add(entity)
    }


    * calculation () : CalculationIterator<this[ 'ValueT' ]> {
        return yield ProposedOrCurrent
    }
}

export type ReferenceBucketIdentifier = Mixin<typeof ReferenceBucketIdentifier>

export class MinimalReferenceBucketIdentifier extends ReferenceBucketIdentifier(MinimalFieldIdentifier) {}


//---------------------------------------------------------------------------------------------------------------------
export const ReferenceBucketQuark = <T extends AnyConstructor<Quark>>(base : T) =>

class ReferenceBucketQuark extends base {
    oldRefs             : Set<Entity>
    newRefs             : Set<Entity>
    previousValue       : Set<Entity>


    set proposedValue (value) {
    }


    get proposedValue () : Set<Entity> {
        const newValue : Set<Entity>        = new Set(this.previousValue || undefined)

        if (this.newRefs) this.newRefs.forEach(entity => newValue.add(entity))

        if (this.oldRefs) this.oldRefs.forEach(entity => newValue.delete(entity))

        return defineProperty(this, 'proposedValue', newValue)
    }
}

export type ReferenceBucketQuark = Mixin<typeof ReferenceBucketQuark>

export class MinimalReferenceBucketQuark extends ReferenceBucketQuark(MinimalQuark) {}
