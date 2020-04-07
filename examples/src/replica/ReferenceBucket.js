var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { CalculatedValueSync, Levels, QuarkSync } from "../chrono/Identifier.js";
import { Quark, TombStone } from "../chrono/Quark.js";
import { Mixin } from "../class/BetterMixin.js";
import { Field } from "../schema/Field.js";
import { prototypeValue } from "../util/Helpers.js";
import { generic_field } from "./Entity.js";
import { FieldIdentifier } from "./Identifier.js";
//---------------------------------------------------------------------------------------------------------------------
/**
 * Mixin, for the identifier that represent a reference bucket field of the entity. Requires the [[Field]] (or its subclass)
 * as a base class. See more about mixins: [[Mixin]]
 */
export class ReferenceBucketField extends Mixin([Field], (base) => class ReferenceBucketField extends base {
    constructor() {
        super(...arguments);
        this.persistent = false;
        this.identifierCls = MinimalReferenceBucketIdentifier;
        // see comment for `ReferenceBucketIdentifier` declaration
        // identifierCls       : FieldIdentifierConstructor    = ReferenceBucketIdentifier
    }
}) {
}
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
export const bucket = (fieldConfig, fieldCls = ReferenceBucketField) => generic_field(fieldConfig, fieldCls);
var BucketMutationType;
(function (BucketMutationType) {
    BucketMutationType["Add"] = "Add";
    BucketMutationType["Remove"] = "Remove";
})(BucketMutationType || (BucketMutationType = {}));
//---------------------------------------------------------------------------------------------------------------------
export class ReferenceBucketQuark extends Mixin([Quark], (base) => class ReferenceBucketQuark extends base {
    constructor() {
        super(...arguments);
        this.mutations = [];
        this.previousValue = undefined;
    }
    hasProposedValueInner() {
        return this.mutations.length > 0;
    }
}) {
}
export const MinimalReferenceBucketQuark = ReferenceBucketQuark.mix(QuarkSync);
//---------------------------------------------------------------------------------------------------------------------
export class ReferenceBucketIdentifier extends Mixin([FieldIdentifier], (base) => {
    // Base class mismatch - should allow subclasses for base class requirements
    // [ FieldIdentifier, CalculatedValueSync ],
    // (base : AnyConstructor<FieldIdentifier & CalculatedValueSync, typeof FieldIdentifier & typeof CalculatedValueSync>) => {
    class ReferenceBucketIdentifier extends base {
        constructor() {
            super(...arguments);
            this.proposedValueIsBuilt = true;
        }
        addToBucket(transaction, entity) {
            const quark = transaction.getWriteTarget(this);
            quark.mutations.push({ type: BucketMutationType.Add, entity });
            const baseRevision = transaction.baseRevision;
            if (!quark.previousValue && baseRevision.hasIdentifier(this))
                quark.previousValue = baseRevision.read(this, transaction.graph);
        }
        removeFromBucket(transaction, entity) {
            const preQuark = transaction.entries.get(this);
            // if bucket is already removed - no need to remove from it
            if (preQuark && preQuark.getValue() === TombStone)
                return;
            const quark = transaction.getWriteTarget(this);
            quark.mutations.push({ type: BucketMutationType.Remove, entity });
            const baseRevision = transaction.baseRevision;
            if (!quark.previousValue && baseRevision.hasIdentifier(this))
                quark.previousValue = baseRevision.read(this, transaction.graph);
        }
        buildProposedValue(me, quarkArg, transaction) {
            const quark = quarkArg;
            const newValue = new Set(quark.previousValue);
            for (let i = 0; i < quark.mutations.length; i++) {
                const { type, entity } = quark.mutations[i];
                if (type === BucketMutationType.Remove) {
                    newValue.delete(entity);
                }
                else if (type === BucketMutationType.Add) {
                    newValue.add(entity);
                }
            }
            return newValue;
        }
    }
    __decorate([
        prototypeValue(Levels.DependsOnlyOnDependsOnlyOnUserInput)
    ], ReferenceBucketIdentifier.prototype, "level", void 0);
    __decorate([
        prototypeValue(MinimalReferenceBucketQuark)
    ], ReferenceBucketIdentifier.prototype, "quarkClass", void 0);
    return ReferenceBucketIdentifier;
}) {
}
//---------------------------------------------------------------------------------------------------------------------
export class MinimalReferenceBucketIdentifier extends ReferenceBucketIdentifier.mix(FieldIdentifier.mix(CalculatedValueSync)) {
}
// export class MinimalReferenceBucketIdentifier extends ReferenceBucketIdentifier.derive(CalculatedValueSync) {}
