import { CalculatedValueSync } from "../chrono/Identifier.js"
import { Quark, QuarkConstructor } from "../chrono/Quark.js"
import { Transaction } from "../chrono/Transaction.js"
import { buildClass } from "../class/InstanceOf.js"
import { AnyConstructor, Mixin } from "../class/Mixin.js"
import { CalculationSync } from "../primitives/Calculation.js"
import { Field } from "../schema/Field.js"
import { defineProperty, prototypeValue } from "../util/Helpers.js"
import { Entity, FieldDecorator, generic_field } from "./Entity.js"
import { FieldIdentifier, FieldIdentifierConstructor } from "./Identifier.js"

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
export const ReferenceBucketIdentifier = <T extends AnyConstructor<FieldIdentifier & CalculatedValueSync>>(base : T) => {

    class ReferenceBucketIdentifier extends base {
        level               : number                = 1

        ValueT              : Set<Entity>

        @prototypeValue(buildClass(Set, CalculationSync, Quark, ReferenceBucketQuark))
        quarkClass          : QuarkConstructor


        addToBucket (transaction : Transaction, entity : Entity) {
            const quark         = transaction.acquireQuark(this) as ReferenceBucketQuarkEntry

            if (!quark.newRefs) quark.newRefs = new Set()

            quark.newRefs.add(entity)

            const baseRevision  = transaction.baseRevision

            if (!quark.previousValue && baseRevision.hasIdentifier(this)) quark.previousValue = baseRevision.read(this)
        }


        removeFromBucket (transaction : Transaction, entity : Entity) {
            const quark         = transaction.acquireQuark(this) as ReferenceBucketQuarkEntry

            if (!quark.oldRefs) quark.oldRefs = new Set()

            quark.oldRefs.add(entity)

            const baseRevision  = transaction.baseRevision

            if (!quark.previousValue && baseRevision.hasIdentifier(this)) quark.previousValue = baseRevision.read(this)
        }


        buildProposedValue (me : this, transaction : Transaction) : Set<Entity> {
            const quark     = transaction.acquireQuark(me) as ReferenceBucketQuarkEntry

            const newValue : Set<Entity>        = new Set(quark.previousValue)

            // need to remove the old references first and then add new - to allow re-adding just removed reference
            if (quark.oldRefs) quark.oldRefs.forEach(entity => newValue.delete(entity))

            if (quark.newRefs) quark.newRefs.forEach(entity => newValue.add(entity))

            return newValue
        }
    }

    return ReferenceBucketIdentifier
}

export type ReferenceBucketIdentifier = Mixin<typeof ReferenceBucketIdentifier>


//---------------------------------------------------------------------------------------------------------------------
export const ReferenceBucketQuark = <T extends AnyConstructor<Quark>>(base : T) =>

class ReferenceBucketQuarkEntry extends base {
    oldRefs             : Set<Entity>   = undefined
    newRefs             : Set<Entity>   = undefined
    previousValue       : Set<Entity>   = undefined
}

export type ReferenceBucketQuarkEntry = Mixin<typeof ReferenceBucketQuark>


//---------------------------------------------------------------------------------------------------------------------
export class MinimalReferenceBucketIdentifier extends ReferenceBucketIdentifier(FieldIdentifier(CalculatedValueSync)) {}