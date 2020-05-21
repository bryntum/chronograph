import { ChronoGraph } from "../chrono/Graph.js"
import { CalculatedValueSync, Levels, QuarkSync } from "../chrono/Identifier.js"
import { Quark, QuarkConstructor, TombStone } from "../chrono/Quark.js"
import { Transaction } from "../chrono/Transaction.js"
import { AnyConstructor, ClassUnion, Mixin } from "../class/Mixin.js"
import { Field } from "../schema/Field.js"
import { prototypeValue } from "../util/Helpers.js"
import { Entity, FieldDecorator, generic_field } from "./Entity.js"
import { FieldIdentifier, FieldIdentifierConstructor } from "./Identifier.js"

//---------------------------------------------------------------------------------------------------------------------
/**
 * Mixin, for the identifier that represent a reference bucket field of the entity. Requires the [[Field]] (or its subclass)
 * as a base class. See more about mixins: [[Mixin]]
 */
export class ReferenceBucketField extends Mixin(
    [ Field ],
    (base : AnyConstructor<Field, typeof Field>) =>

class ReferenceBucketField extends base {
    persistent          : boolean   = false

    identifierCls       : FieldIdentifierConstructor    = MinimalReferenceBucketIdentifier
    // see comment for `ReferenceBucketIdentifier` declaration
    // identifierCls       : FieldIdentifierConstructor    = ReferenceBucketIdentifier
}){}


//---------------------------------------------------------------------------------------------------------------------
/**
 * Specialized version of the [field](_replica_entity_.html#field) decorator, which should be used to mark the reference buckets.
 * All it does is replace the default value of the second argument to the [[ReferenceBucketField]].
 *
 * ```ts
 * class Author extends Person {
 *     @bucket()
 *     books           : Set<Book>
 * }
 *
 * class Book extends Entity.mix(Base) {
 *     @reference({ bucket : 'books' })
 *     writtenBy       : Author
 * }
 * ```
 *
 * @param fieldConfig Object with the field configuration properties
 * @param fieldCls Optional. Default value has been changed to [[ReferenceBucketField]]
 */
export const bucket : FieldDecorator<typeof ReferenceBucketField> =
    (fieldConfig?, fieldCls = ReferenceBucketField) => generic_field(fieldConfig, fieldCls)


enum BucketMutationType {
    'Add'       = 'Add',
    'Remove'    = 'Remove'
}

type BucketMutation  = {
    type        : BucketMutationType,
    entity      : Entity
}

//---------------------------------------------------------------------------------------------------------------------
export class ReferenceBucketQuark extends Mixin(
    [ Quark ],
    (base : ClassUnion<typeof Quark>) =>

class ReferenceBucketQuark extends base {
    mutations           : BucketMutation[]  = []

    previousValue       : Set<Entity>   = undefined


    hasProposedValueInner () : boolean {
        return this.mutations.length > 0
    }
}){}

export const MinimalReferenceBucketQuark = ReferenceBucketQuark.mix(QuarkSync)


//---------------------------------------------------------------------------------------------------------------------
export class ReferenceBucketIdentifier extends Mixin(
    [ FieldIdentifier ],
    (base : AnyConstructor<FieldIdentifier, typeof FieldIdentifier>) => {
    // Base class mismatch - should allow subclasses for base class requirements
    // [ FieldIdentifier, CalculatedValueSync ],
    // (base : AnyConstructor<FieldIdentifier & CalculatedValueSync, typeof FieldIdentifier & typeof CalculatedValueSync>) => {

    class ReferenceBucketIdentifier extends base {
        @prototypeValue(Levels.DependsOnlyOnDependsOnlyOnUserInput)
        level               : number

        ValueT              : Set<Entity>

        proposedValueIsBuilt    : boolean   = true

        @prototypeValue(MinimalReferenceBucketQuark)
        quarkClass          : QuarkConstructor


        addToBucket (transaction : Transaction, entity : Entity) {
            const quark         = transaction.getWriteTarget(this) as ReferenceBucketQuark

            quark.mutations.push({ type : BucketMutationType.Add, entity })

            const baseRevision  = transaction.baseRevision

            if (!quark.previousValue && baseRevision.hasIdentifier(this)) quark.previousValue = transaction.readPrevious(this)
        }


        removeFromBucket (transaction : Transaction, entity : Entity) {
            const preQuark      = transaction.entries.get(this)

            // if bucket is already removed - no need to remove from it
            if (preQuark && preQuark.getValue() === TombStone) return

            const quark         = transaction.getWriteTarget(this) as ReferenceBucketQuark

            quark.mutations.push({ type : BucketMutationType.Remove, entity })

            const baseRevision  = transaction.baseRevision

            if (!quark.previousValue && baseRevision.hasIdentifier(this)) quark.previousValue = transaction.readPrevious(this)
        }


        buildProposedValue (me : this, quarkArg : Quark, transaction : Transaction) : Set<Entity> {
            const quark                         = quarkArg as ReferenceBucketQuark
            const newValue : Set<Entity>        = new Set(quark.previousValue)

            for (let i = 0; i < quark.mutations.length; i++) {
                const { type, entity } = quark.mutations[ i ]

                if (type === BucketMutationType.Remove) {
                    newValue.delete(entity)
                }
                else if (type === BucketMutationType.Add) {
                    newValue.add(entity)
                }
            }

            return newValue
        }


        leaveGraph (graph : ChronoGraph) {
            super.leaveGraph(graph)

            this.DATA = undefined
        }
    }

    return ReferenceBucketIdentifier
}){}




//---------------------------------------------------------------------------------------------------------------------
export class MinimalReferenceBucketIdentifier extends ReferenceBucketIdentifier.mix(FieldIdentifier.mix(CalculatedValueSync)) {}
// export class MinimalReferenceBucketIdentifier extends ReferenceBucketIdentifier.derive(CalculatedValueSync) {}
