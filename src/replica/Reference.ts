import { CheckoutI } from "../chrono/Checkout.js"
import { ChronoGraph } from "../chrono/Graph.js"
import { CalculatedValueGen, Identifier } from "../chrono/Identifier.js"
import { MinimalQuark, Quark, QuarkConstructor } from "../chrono/Quark.js"
import { GetGraph, ProposedOrCurrent } from "../chrono/Transaction.js"
import { AnyConstructor, Mixin } from "../class/Mixin.js"
import { CalculationIterator } from "../primitives/Calculation.js"
import { Field, Name } from "../schema/Field.js"
import { defineProperty, isAtomicValue } from "../util/Helpers.js"
import { Entity, FieldDecorator, generic_field } from "./Entity.js"
import { FieldIdentifier, FieldIdentifierConstructor } from "./Identifier.js"
import { MinimalReferenceBucketQuark, ReferenceBucketIdentifier } from "./ReferenceBucket.js"

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


    * calculation () : CalculationIterator<this[ 'ValueT' ]> {
        const proposedValue     = yield ProposedOrCurrent

        const value : Entity    = proposedValue instanceof Entity ? proposedValue as Entity : this.resolve(proposedValue)

        // if (value) {
        //     this.getBucket(value).addToBucket(yield GetGraph, this.self)
        //
        //     if (this.field.intrinsic) yield value.$$
        // }

        return value
    }


    resolve (locator : any) : Entity {
        const resolver  = this.field.resolver

        return resolver ? resolver.call(this.self, locator) : null
    }


    getBucket (entity : Entity) : ReferenceBucketIdentifier {
        return entity.$[ this.field.bucket ]
    }


    // onEnterGraph (graph : ChronoGraph) {
    //     const value     = this.get()
    //
    //     let resolves    = true
    //
    //     if (value !== undefined && isAtomicValue(value)) {
    //         resolves        = false
    //
    //         const resolved  = this.resolve(value)
    //
    //         // last point where it is safe to just rewrite own value
    //         // after `super.onEnterGraph` that will be causing effects outside of atom
    //         if (!isAtomicValue(resolved)) {
    //             this.put(resolved)
    //
    //             resolves    = true
    //         }
    //     }
    //
    //     super.onEnterGraph(graph)
    //
    //     if (this.get() !== undefined && resolves && this.hasBucket()) {
    //         const referenceBucket  = this.getBucket(this.get())
    //
    //         this.addToBucket(referenceBucket)
    //     }
    // }


    // removeFromCurrent (graph : CheckoutI) {
    //     if (this.hasBucket()) {
    //         const value  = graph.read(this) as Entity
    //
    //         if (value != null) {
    //             this.removeFromBucket(graph, this.getBucket(value))
    //         }
    //     }
    // }


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

            if (proposedValue instanceof Entity) {
                this.getBucket(proposedValue).addToBucket(graph, this.self)
            }
        }

        super.write(graph, proposedValue)
    }


    // put (nextValue : this[ 'value' ]) {
    //     const value     = this.value
    //
    //     if (this.hasBucket()) {
    //         // value is not empty and resolved to entity
    //         if (value != null && !isAtomicValue(value)) {
    //             this.removeFromBucket(this.getBucket(value))
    //         }
    //
    //         if (nextValue != null) {
    //             if (isAtomicValue(nextValue)) {
    //                 const newValue = this.resolve(nextValue)
    //                 if (newValue != null) {
    //                     this.addToBucket(this.getBucket(newValue))
    //                     nextValue = newValue
    //                 }
    //             } else {
    //                 this.addToBucket(this.getBucket(nextValue))
    //             }
    //         }
    //     }
    //
    //     super.put(nextValue)
    // }
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
