import { ChronoGraph } from "../chrono/Graph.js"
import { CalculatedValueSync, Levels, QuarkSync } from "../chrono/Identifier.js"
import { Quark, QuarkConstructor } from "../chrono/Quark.js"
import { Transaction } from "../chrono/Transaction.js"
import { AnyConstructor, isInstanceOf, Mixin } from "../class/Mixin.js"
import { Field, Name } from "../schema/Field.js"
import { prototypeValue } from "../util/Helpers.js"
import { Entity, FieldDecorator, generic_field } from "./Entity.js"
import { FieldIdentifier, FieldIdentifierConstructor } from "./Identifier.js"
import { ReferenceBucketIdentifier } from "./ReferenceBucket.js"

//---------------------------------------------------------------------------------------------------------------------
export type ResolverFunc    = (locator : any) => Entity


//---------------------------------------------------------------------------------------------------------------------
/**
 * Mixin, for the identifier that represent a reference field of the entity. Requires the [[Field]] (or its subclass)
 * as a base class. See more about mixins: [[Mixin]]
 */
export class ReferenceField extends Mixin(
    [ Field ],
    (base : AnyConstructor<Field, typeof Field>) =>

class ReferenceField extends base {
    identifierCls       : FieldIdentifierConstructor    = MinimalReferenceIdentifier

    resolver            : ResolverFunc

    /**
     * The name of the "bucket" field on this reference's value. The entity to which this reference field belongs
     * will be added to that "bucket"
     */
    bucket              : Name
}){}


//---------------------------------------------------------------------------------------------------------------------
/**
 * Specialized version of the [field](_replica_entity_.html#field) decorator, which should be used to mark the references.
 * All it does is replace the default value of the second argument to the [[ReferenceField]].
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
 * @param fieldConfig Object with the configuration properties
 * @param fieldCls Optional. Default value has been changed to [[ReferenceField]]
 */
export const reference : FieldDecorator<typeof ReferenceField> =
    (fieldConfig?, fieldCls = ReferenceField) => generic_field(fieldConfig, fieldCls)


//---------------------------------------------------------------------------------------------------------------------
export class ReferenceIdentifier extends Mixin(
    [ FieldIdentifier ],
    (base : AnyConstructor<FieldIdentifier, typeof FieldIdentifier>) => {

    class ReferenceIdentifier extends base {
        @prototypeValue(Levels.DependsOnlyOnUserInput)
        level           : number

        field           : ReferenceField    = undefined

        ValueT          : Entity

        proposedValueIsBuilt    : boolean   = true

        @prototypeValue(QuarkSync)
        quarkClass          : QuarkConstructor


        hasBucket () : boolean {
            return Boolean(this.field.bucket)
        }


        getBucket (entity : Entity) : ReferenceBucketIdentifier {
            return entity.$[ this.field.bucket ]
        }


        buildProposedValue (me : this, quark : Quark, transaction : Transaction) : this[ 'ValueT' ] {
            const proposedValue     = quark.proposedValue

            if (proposedValue === null) return null

            const value : Entity    = isInstanceOf(proposedValue, Entity) ? proposedValue : me.resolve(proposedValue)

            if (value && me.hasBucket()) {
                me.getBucket(value).addToBucket(transaction, me.self)
            }

            return value
        }


        resolve (locator : any) : Entity | null {
            const resolver  = this.field.resolver

            return resolver ? resolver.call(this.self, locator) : null
        }


        enterGraph (graph : ChronoGraph) {
            if (this.hasBucket()) {
                const value  = graph.activeTransaction.readProposedOrPrevious(this) as Entity

                if (value instanceof Entity) {
                    // should probably involve `touchInvalidate` here
                    this.getBucket(value).addToBucket(graph.activeTransaction, this.self)
                }
            }

            super.enterGraph(graph)
        }


        leaveGraph (graph : ChronoGraph) {
            if (this.hasBucket()) {
                // here we only need to remove from the "previous", "stable" bucket, because
                // the calculation for the removed reference won't be called - the possible `proposedValue` of reference will be ignored
                const value  = graph.activeTransaction.readProposedOrPrevious(this) as Entity

                if (value instanceof Entity) {
                    this.getBucket(value).removeFromBucket(graph.activeTransaction, this.self)
                }
            }

            super.leaveGraph(graph)
        }

        write (me : this, transaction : Transaction, q : InstanceType<this[ 'quarkClass' ]>, proposedValue : this[ 'ValueT' ], ...args : this[ 'ArgsT' ]) {
            const quark           = q || transaction.acquireQuarkIfExists(me)

            if (me.hasBucket()) {
                if (quark) {
                    const prevValue     = quark.getValue()

                    if (prevValue instanceof Entity) {
                        me.getBucket(prevValue).removeFromBucket(transaction, me.self)
                    }
                }
                else if (transaction.baseRevision.hasIdentifier(me)) {
                    const value  = transaction.readPrevious(me) as Entity

                    if (value instanceof Entity) {
                        me.getBucket(value).removeFromBucket(transaction, me.self)
                    }
                }
            }

            // we pass the `q` to super and not `quark`, because we don't do `getWriteTarget` (which increment the epoch)
            // but only `acquireQuarkIfExists` (which does not)
            super.write(me, transaction, q, proposedValue)
        }
    }

    return ReferenceIdentifier
}){}


export class MinimalReferenceIdentifier extends ReferenceIdentifier.mix(FieldIdentifier.mix(CalculatedValueSync)) {}
