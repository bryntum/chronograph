import { ChronoGraph } from "../chrono/Graph.js"
import { CalculatedValueSync, Levels } from "../chrono/Identifier.js"
import { Quark, QuarkConstructor } from "../chrono/Quark.js"
import { Transaction } from "../chrono/Transaction.js"
import { buildClass, instanceOf, isInstanceOf } from "../class/InstanceOf.js"
import { AnyConstructor, Mixin } from "../class/Mixin.js"
import { CalculationSync } from "../primitives/Calculation.js"
import { Field, Name } from "../schema/Field.js"
import { prototypeValue } from "../util/Helpers.js"
import { Entity, FieldDecorator, generic_field } from "./Entity.js"
import { FieldIdentifier, FieldIdentifierConstructor } from "./Identifier.js"
import { ReferenceBucketIdentifier } from "./ReferenceBucket.js"

//---------------------------------------------------------------------------------------------------------------------
export type ResolverFunc    = (locator : any) => Entity


//---------------------------------------------------------------------------------------------------------------------
export const ReferenceField = instanceOf(<T extends AnyConstructor<Field>>(base : T) =>

class ReferenceField extends base {
    identifierCls       : FieldIdentifierConstructor    = MinimalReferenceIdentifier

    resolver            : ResolverFunc

    bucket              : Name
})

export type ReferenceField = Mixin<typeof ReferenceField>

export class MinimalReferenceField extends ReferenceField(Field) {}

//---------------------------------------------------------------------------------------------------------------------
export const reference : FieldDecorator<typeof MinimalReferenceField> =
    (fieldConfig?, fieldCls = MinimalReferenceField) => generic_field(fieldConfig, fieldCls)


//---------------------------------------------------------------------------------------------------------------------
export const ReferenceIdentifier = instanceOf(<T extends AnyConstructor<FieldIdentifier & CalculatedValueSync>>(base : T) => {

    class ReferenceIdentifier extends base {
        level           : number            = Levels.Constant

        field           : ReferenceField    = undefined

        ValueT          : Entity

        proposedValueIsBuilt    : boolean   = true

        @prototypeValue(buildClass(Map, CalculationSync, Quark))
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


        leaveGraph (graph : ChronoGraph) {
            if (this.hasBucket()) {
                // here we only need to remove from the "previous", "stable" bucket, because
                // the calculation for the removed reference won't be called - the possible `proposedValue` of reference will be ignored
                const value  = graph.readIfExists(this) as Entity

                if (value != null) {
                    this.getBucket(value).removeFromBucket(graph.activeTransaction, this.self)
                }
            }

            super.leaveGraph(graph)
        }


        write (me : this, transaction : Transaction, quark : Quark, proposedValue : this[ 'ValueT' ]) {
            quark           = quark || transaction.acquireQuarkIfExists(me)

            if (me.hasBucket()) {
                if (quark) {
                    const proposedValue     = quark.proposedValue

                    if (isInstanceOf(proposedValue, Entity)) {
                        me.getBucket(proposedValue).removeFromBucket(transaction, me.self)
                    }
                }
                else if (transaction.baseRevision.hasIdentifier(me)) {
                    const value  = transaction.baseRevision.read(me) as Entity

                    if (value != null) {
                        me.getBucket(value).removeFromBucket(transaction, me.self)
                    }
                }
            }

            super.write(me, transaction, quark, proposedValue)
        }
    }

    return ReferenceIdentifier

})

export type ReferenceIdentifier = Mixin<typeof ReferenceIdentifier>


export class MinimalReferenceIdentifier extends ReferenceIdentifier(FieldIdentifier(CalculatedValueSync)) {}
