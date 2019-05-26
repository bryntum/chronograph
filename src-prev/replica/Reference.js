import { MinimalChronoAtom } from "../chrono/Atom.js";
import { Field } from "../schema/Field.js";
import { isAtomicValue } from "../util/Helper.js";
import { FieldAtom, MinimalFieldAtom } from "./Atom.js";
import { generic_field } from "./Entity.js";
//---------------------------------------------------------------------------------------------------------------------
export const ReferenceFieldMixin = (base) => class ReferenceFieldMixin extends base {
    constructor() {
        super(...arguments);
        this.atomCls = MinimalReferenceAtom;
    }
};
export class ReferenceField extends ReferenceFieldMixin(Field) {
}
//---------------------------------------------------------------------------------------------------------------------
export const ReferenceBucketFieldMixin = (base) => class ReferenceBucketFieldMixin extends base {
    constructor() {
        super(...arguments);
        this.persistent = false;
        this.atomCls = MinimalReferenceBucketAtom;
    }
};
export class ReferenceBucketField extends ReferenceBucketFieldMixin(Field) {
}
//---------------------------------------------------------------------------------------------------------------------
export const bucket = (fieldConfig, fieldCls = ReferenceBucketField) => generic_field(fieldConfig, fieldCls);
export const reference = (fieldConfig, fieldCls = ReferenceField) => generic_field(fieldConfig, fieldCls);
//---------------------------------------------------------------------------------------------------------------------
export const ReferenceBucketAtom = (base) => class ReferenceBucketAtom extends base {
    constructor() {
        super(...arguments);
        this.oldRefs = new Set();
        this.newRefs = new Set();
        this.value = new Set();
    }
    commitValue() {
        super.commitValue();
        this.oldRefs.clear();
        this.newRefs.clear();
    }
    reject() {
        super.reject();
        this.oldRefs.clear();
        this.newRefs.clear();
    }
    *calculate(proposedValue) {
        const result = new Set();
        let atom;
        for (atom of this.incoming) {
            if (!this.oldRefs.has(atom)) {
                const referencee = yield atom;
                if (referencee != null)
                    result.add(referencee);
            }
        }
        for (atom of this.newRefs) {
            const referencee = yield atom;
            if (referencee != null)
                result.add(referencee);
        }
        return result;
    }
};
export class MinimalReferenceBucketAtom extends ReferenceBucketAtom(MinimalFieldAtom) {
}
//---------------------------------------------------------------------------------------------------------------------
export const ReferenceAtom = (base) => class ReferenceAtom extends base {
    hasBucket() {
        return Boolean(this.field.bucket);
    }
    addToBucket(bucket) {
        bucket.newRefs.add(this.self.$$);
        this.graph && this.graph.markAsNeedRecalculation(bucket);
    }
    removeFromBucket(bucket) {
        bucket.oldRefs.add(this.self.$$);
        this.graph && this.graph.markAsNeedRecalculation(bucket);
    }
    *calculate(proposedValue) {
        const value = this.resolve(proposedValue !== undefined ? proposedValue : this.value);
        // add an incoming edge from the referencee's self-atom
        if (!isAtomicValue(value))
            yield value.$$;
        return value;
    }
    resolve(referencee) {
        const resolver = this.field.resolver;
        if (resolver && referencee !== undefined && isAtomicValue(referencee)) {
            return resolver.call(this.self, referencee);
        }
        else {
            return referencee;
        }
    }
    getBucket(entity) {
        return entity.$[this.field.bucket];
    }
    onEnterGraph(graph) {
        const value = this.get();
        let resolves = true;
        if (value !== undefined && isAtomicValue(value)) {
            resolves = false;
            const resolved = this.resolve(value);
            // last point where it is safe to just rewrite own value
            // after `super.onEnterGraph` that will be causing effects outside of atom
            if (!isAtomicValue(resolved)) {
                this.put(resolved);
                resolves = true;
            }
        }
        super.onEnterGraph(graph);
        if (this.get() !== undefined && resolves && this.hasBucket()) {
            const referenceBucket = this.getBucket(this.get());
            this.addToBucket(referenceBucket);
        }
    }
    onLeaveGraph(graph) {
        if (this.hasValue() && this.hasBucket()) {
            const value = this.get();
            if (!isAtomicValue(value)) {
                const referenceBucket = this.getBucket(value);
                this.removeFromBucket(referenceBucket);
            }
        }
        super.onLeaveGraph(graph);
    }
    put(nextValue) {
        const value = this.value;
        if (this.hasBucket()) {
            // value is not empty and resolved to entity
            if (value != null && !isAtomicValue(value)) {
                this.removeFromBucket(this.getBucket(value));
            }
            if (nextValue != null) {
                if (isAtomicValue(nextValue)) {
                    const newValue = this.resolve(nextValue);
                    if (newValue != null) {
                        this.addToBucket(this.getBucket(newValue));
                        nextValue = newValue;
                    }
                }
                else {
                    this.addToBucket(this.getBucket(nextValue));
                }
            }
        }
        super.put(nextValue);
    }
};
export class MinimalReferenceAtom extends ReferenceAtom(FieldAtom(MinimalChronoAtom)) {
}
