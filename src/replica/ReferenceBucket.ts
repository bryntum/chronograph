import { CalculatedValueSync, Levels } from "../chrono/Identifier.js"
import { Quark, QuarkConstructor } from "../chrono/Quark.js"
import { Transaction } from "../chrono/Transaction.js"
import { AnyConstructor, ClassUnion, identity, Mixin } from "../class/BetterMixin.js"
import { CalculationSync } from "../primitives/Calculation.js"
import { Field } from "../schema/Field.js"
import { prototypeValue } from "../util/Helpers.js"
import { Entity, FieldDecorator, generic_field } from "./Entity.js"
import { FieldIdentifier, FieldIdentifierConstructor } from "./Identifier.js"

//---------------------------------------------------------------------------------------------------------------------
export class ReferenceBucketField extends Mixin(
    [ Field ],
    (base : AnyConstructor<Field, typeof Field>) =>

class ReferenceBucketField extends base {
    persistent          : boolean   = false

    identifierCls       : FieldIdentifierConstructor    = MinimalReferenceBucketIdentifier
}){}


//---------------------------------------------------------------------------------------------------------------------
export const bucket : FieldDecorator<typeof ReferenceBucketField> =
    (fieldConfig?, fieldCls = ReferenceBucketField) => generic_field(fieldConfig, fieldCls)


//---------------------------------------------------------------------------------------------------------------------
export class ReferenceBucketQuark extends Mixin(
    [ Quark ],
    (base : ClassUnion<typeof Quark>) =>

class ReferenceBucketQuark extends base {
    oldRefs             : Set<Entity>   = undefined
    newRefs             : Set<Entity>   = undefined
    previousValue       : Set<Entity>   = undefined


    hasProposedValueInner () : boolean {
        return Boolean(this.oldRefs || this.newRefs)
    }
}){}


//---------------------------------------------------------------------------------------------------------------------
export class ReferenceBucketIdentifier extends Mixin(
    [ FieldIdentifier ],
    (base : AnyConstructor<FieldIdentifier, typeof FieldIdentifier>) => {

    class ReferenceBucketIdentifier extends base {
        @prototypeValue(Levels.DependsOnlyOnDependsOnlyOnUserInput)
        level               : number

        ValueT              : Set<Entity>

        proposedValueIsBuilt    : boolean   = true

        @prototypeValue(Mixin([ ReferenceBucketQuark, CalculationSync, Quark, Map ], identity))
        quarkClass          : QuarkConstructor


        addToBucket (transaction : Transaction, entity : Entity) {
            const quark         = transaction.getWriteTarget(this) as ReferenceBucketQuark

            if (!quark.newRefs) quark.newRefs = new Set()

            quark.newRefs.add(entity)

            const baseRevision  = transaction.baseRevision

            if (!quark.previousValue && baseRevision.hasIdentifier(this)) quark.previousValue = baseRevision.read(this, transaction.graph)
        }


        removeFromBucket (transaction : Transaction, entity : Entity) {
            const quark         = transaction.getWriteTarget(this) as ReferenceBucketQuark

            if (!quark.oldRefs) quark.oldRefs = new Set()

            quark.oldRefs.add(entity)

            const baseRevision  = transaction.baseRevision

            if (!quark.previousValue && baseRevision.hasIdentifier(this)) quark.previousValue = baseRevision.read(this, transaction.graph)
        }


        buildProposedValue (me : this, quarkArg : Quark, transaction : Transaction) : Set<Entity> {
            const quark                         = quarkArg as ReferenceBucketQuark
            const newValue : Set<Entity>        = new Set(quark.previousValue)

            // need to remove the old references first and then add new - to allow re-adding just removed reference
            if (quark.oldRefs) quark.oldRefs.forEach(entity => newValue.delete(entity))

            if (quark.newRefs) quark.newRefs.forEach(entity => newValue.add(entity))

            return newValue
        }
    }

    return ReferenceBucketIdentifier
}){}




//---------------------------------------------------------------------------------------------------------------------
export class MinimalReferenceBucketIdentifier extends ReferenceBucketIdentifier.mix(FieldIdentifier.mix(CalculatedValueSync)) {}
