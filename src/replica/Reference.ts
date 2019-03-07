import {ChronoAtom, ChronoValue, MinimalChronoAtom} from "../chrono/Atom.js";
import {ChronoGraph} from "../chrono/Graph.js";
import {AnyConstructor, Mixin, MixinConstructor} from "../class/Mixin.js";
import {Field, Name} from "../schema/Field.js";
import {isAtomicValue} from "../util/Helper.js";
import {FieldAtom, MinimalFieldAtom} from "./Atom.js";
import {Entity, FieldDecorator, generic_field} from "./Entity.js";


//---------------------------------------------------------------------------------------------------------------------
export type ResolverFunc    = (locator : any) => Entity


//---------------------------------------------------------------------------------------------------------------------
export const ReferenceFieldMixin = <T extends AnyConstructor<Field>>(base : T) =>

class ReferenceFieldMixin extends base {
    atomCls             : MixinConstructor<typeof FieldAtom>    = MinimalReferenceAtom

    resolver            : ResolverFunc

    bucket              : Name
}

export type ReferenceFieldMixin = Mixin<typeof ReferenceFieldMixin>


export class ReferenceField extends ReferenceFieldMixin(Field) {}


//---------------------------------------------------------------------------------------------------------------------
export class ReferenceBucketField extends Field {
    persistent          : boolean   = false

    atomCls             : MixinConstructor<typeof FieldAtom>    = MinimalReferenceBucketAtom
}


//---------------------------------------------------------------------------------------------------------------------
export const bucket : FieldDecorator<typeof ReferenceBucketField> = (fieldConfig?, fieldCls = ReferenceBucketField) => generic_field(fieldConfig, fieldCls)


export const reference : FieldDecorator<typeof ReferenceField> = (fieldConfig?, fieldCls = ReferenceField) => generic_field(fieldConfig, fieldCls)


//---------------------------------------------------------------------------------------------------------------------
export const ReferenceBucketAtom = <T extends AnyConstructor<FieldAtom>>(base : T) =>

class ReferenceBucketAtom extends base {
    // upgrade the type of the `incoming` property
    incoming        : Set<MinimalReferenceAtom>

    oldRefs         : Set<ChronoAtom>       = new Set()
    newRefs         : Set<ChronoAtom>       = new Set()

    value           : Set<Entity>           = new Set();


    * calculate (proposedValue : ChronoValue) : IterableIterator<ChronoAtom | this[ 'value' ]> {
        const result        = new Set()

        let atom : ChronoAtom

        for (atom of this.incoming) {
            if (!this.oldRefs.has(atom)) {
                const referencee    = yield atom

                if (referencee != null) result.add(referencee)
            }
        }

        for (atom of this.newRefs) {
            const referencee    = yield atom

            if (referencee != null) result.add(referencee)
        }

        return result
    }


    commitValue () {
        super.commitValue()

        this.oldRefs.clear()
        this.newRefs.clear()
    }


    reject () {
        super.reject()

        this.oldRefs.clear()
        this.newRefs.clear()
    }
}

export type ReferenceBucketAtom = Mixin<typeof ReferenceBucketAtom>

export class MinimalReferenceBucketAtom extends ReferenceBucketAtom(MinimalFieldAtom) {}


//---------------------------------------------------------------------------------------------------------------------
export const ReferenceAtom = <T extends AnyConstructor<FieldAtom>>(base : T) =>

class ReferenceAtom extends base {
    field           : ReferenceField

    value           : Entity


    hasBucket () : boolean {
        return Boolean(this.field.bucket)
    }


    addToBucket (bucket : ReferenceBucketAtom) {
        bucket.newRefs.add(this.self.$$)

        this.graph && this.graph.markAsNeedRecalculation(bucket)
    }


    removeFromBucket (bucket : ReferenceBucketAtom) {
        bucket.oldRefs.add(this.self.$$)

        this.graph && this.graph.markAsNeedRecalculation(bucket)
    }


    * calculate (proposedValue : this[ 'value' ]) : IterableIterator<ChronoAtom | this[ 'value' ]> {
        const value     = this.resolve(proposedValue !== undefined ? proposedValue : this.value)

        // add an incoming edge from the referencee's self-atom
        if (!isAtomicValue(value)) yield value.$$

        return value
    }


    resolve (referencee : any) : Entity {
        const resolver  = this.field.resolver

        if (resolver && referencee !== undefined && isAtomicValue(referencee)) {
            return resolver.call(this.self, referencee)
        } else {
            return referencee
        }
    }


    getBucket (entity : Entity) : ReferenceBucketAtom {
        return entity.$[ this.field.bucket ]
    }


    onEnterGraph (graph : ChronoGraph) {
        const value     = this.get()

        let resolves    = true

        if (value !== undefined && isAtomicValue(value)) {
            resolves        = false

            const resolved  = this.resolve(value)

            // last point where it is safe to just rewrite own value
            // after `super.onEnterGraph` that will be causing effects outside of atom
            if (!isAtomicValue(resolved)) {
                this.put(resolved)

                resolves    = true
            }
        }

        super.onEnterGraph(graph)

        if (this.get() !== undefined && resolves && this.hasBucket()) {
            const referenceBucket  = this.getBucket(this.get())

            this.addToBucket(referenceBucket)
        }
    }


    onLeaveGraph (graph : ChronoGraph) {
        if (this.hasStableValue() && this.hasBucket()) {
            const referenceBucket  = this.getBucket(this.value)

            this.removeFromBucket(referenceBucket)
        }

        super.onLeaveGraph(graph)
    }


    put (nextValue : this[ 'value']) {
        const value     = this.value

        // value is not empty and resolved to entity
        if (value != null && !isAtomicValue(value) && this.hasBucket()) {
            this.removeFromBucket(this.getBucket(value))
        }

        if (nextValue != null && !isAtomicValue(nextValue) && this.hasBucket()) {
            this.addToBucket(this.getBucket(nextValue))
        }

        super.put(nextValue)
    }
}

export type ReferenceAtom = Mixin<typeof ReferenceAtom>


export class MinimalReferenceAtom extends ReferenceAtom(FieldAtom(MinimalChronoAtom)) {}
