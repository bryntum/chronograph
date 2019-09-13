import { CheckoutI } from "../chrono/Checkout.js"
import { ChronoGraph } from "../chrono/Graph.js"
import { CalculatedValueGen } from "../chrono/Identifier.js"
import { MinimalQuark, Quark, QuarkConstructor } from "../chrono/Quark.js"
import { GetGraph, ProposedOrCurrent } from "../chrono/Transaction.js"
import { AnyConstructor, Mixin } from "../class/Mixin.js"
import { CalculationIterator } from "../primitives/Calculation.js"
import { Field, Name } from "../schema/Field.js"
import { Entity, FieldDecorator, generic_field } from "./Entity.js"
import { FieldIdentifier, FieldIdentifierConstructor } from "./Identifier.js"
import { ReferenceBucketIdentifier } from "./ReferenceBucket.js"

//---------------------------------------------------------------------------------------------------------------------
export type ResolverFunc    = (locator : any) => Entity


//---------------------------------------------------------------------------------------------------------------------
export const ReferenceField = <T extends AnyConstructor<Field>>(base : T) =>

class ReferenceField extends base {
    identifierCls       : FieldIdentifierConstructor    = MinimalReferenceIdentifier

    resolver            : ResolverFunc

    bucket              : Name
}

export type ReferenceField = Mixin<typeof ReferenceField>

export class MinimalReferenceField extends ReferenceField(Field) {}

//---------------------------------------------------------------------------------------------------------------------
export const reference : FieldDecorator<typeof MinimalReferenceField> =
    (fieldConfig?, fieldCls = MinimalReferenceField) => generic_field(fieldConfig, fieldCls)


//---------------------------------------------------------------------------------------------------------------------
export const ReferenceIdentifier = <T extends AnyConstructor<FieldIdentifier & CalculatedValueGen>>(base : T) =>

class ReferenceIdentifier extends base {
    field           : ReferenceField

    ValueT          : Entity

    quarkClass      : QuarkConstructor      = MinimalReferenceQuark


    hasBucket () : boolean {
        return Boolean(this.field.bucket)
    }


    // TODO this can be "simulated" as a delayed `proposedValue` calculation, avoiding a generator call
    * calculation () : CalculationIterator<this[ 'ValueT' ]> {
        const proposedValue     = yield ProposedOrCurrent

        const value : Entity    = proposedValue instanceof Entity ? proposedValue as Entity : this.resolve(proposedValue)

        if (value && this.hasBucket()) {
            this.getBucket(value).addToBucket(yield GetGraph, this.self)
        }

        return value
    }


    resolve (locator : any) : Entity {
        const resolver  = this.field.resolver

        return resolver ? resolver.call(this.self, locator) : null
    }


    getBucket (entity : Entity) : ReferenceBucketIdentifier {
        return entity.$[ this.field.bucket ]
    }


    removeFromCurrent (graph : CheckoutI) {
        if (this.hasBucket()) {
            const value  = graph.read(this) as Entity

            if (value != null) this.getBucket(value).removeFromBucket(graph, this.self)
        }
    }


    leaveGraph (graph : ChronoGraph) {
        if (this.hasBucket()) {
            const value  = graph.read(this) as Entity

            if (value != null) {
                this.getBucket(value).removeFromBucket(graph, this.self)
            }
        }

        super.leaveGraph(graph)
    }


    write (graph : CheckoutI, proposedValue : this[ 'ValueT' ]) {
        if (this.hasBucket()) {
            if (graph.hasIdentifier(this)) {
                const value  = graph.read(this) as Entity

                if (value != null) {
                    this.getBucket(value).removeFromBucket(graph, this.self)
                }
            }
        }

        super.write(graph, proposedValue)
    }
}

export type ReferenceIdentifier = Mixin<typeof ReferenceIdentifier>


export class MinimalReferenceIdentifier extends ReferenceIdentifier(FieldIdentifier(CalculatedValueGen)) {}



//---------------------------------------------------------------------------------------------------------------------
export const ReferenceQuark = <T extends AnyConstructor<Quark>>(base : T) =>

class ReferenceQuark extends base {

    // set proposedValue (value) {
    // }
    //
    //
    // get proposedValue () : Set<Entity> {
    //     const newValue : Set<Entity>        = new Set(this.previousValue || undefined)
    //
    //     if (this.newRefs) this.newRefs.forEach(entity => newValue.add(entity))
    //
    //     if (this.oldRefs) this.oldRefs.forEach(entity => newValue.delete(entity))
    //
    //     return defineProperty(this, 'proposedValue', newValue)
    // }
}

export type ReferenceQuark = Mixin<typeof ReferenceQuark>


export class MinimalReferenceQuark extends ReferenceQuark(MinimalQuark) {}
