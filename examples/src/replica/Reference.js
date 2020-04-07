var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { CalculatedValueSync, Levels, QuarkSync } from "../chrono/Identifier.js";
import { isInstanceOf, Mixin } from "../class/BetterMixin.js";
import { Field } from "../schema/Field.js";
import { prototypeValue } from "../util/Helpers.js";
import { Entity, generic_field } from "./Entity.js";
import { FieldIdentifier } from "./Identifier.js";
//---------------------------------------------------------------------------------------------------------------------
/**
 * Mixin, for the identifier that represent a reference field of the entity. Requires the [[Field]] (or its subclass)
 * as a base class. See more about mixins: [[Mixin]]
 */
export class ReferenceField extends Mixin([Field], (base) => class ReferenceField extends base {
    constructor() {
        super(...arguments);
        this.identifierCls = MinimalReferenceIdentifier;
    }
}) {
}
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
export const reference = (fieldConfig, fieldCls = ReferenceField) => generic_field(fieldConfig, fieldCls);
//---------------------------------------------------------------------------------------------------------------------
export class ReferenceIdentifier extends Mixin([FieldIdentifier], (base) => {
    class ReferenceIdentifier extends base {
        constructor() {
            super(...arguments);
            this.field = undefined;
            this.proposedValueIsBuilt = true;
        }
        hasBucket() {
            return Boolean(this.field.bucket);
        }
        getBucket(entity) {
            return entity.$[this.field.bucket];
        }
        buildProposedValue(me, quark, transaction) {
            const proposedValue = quark.proposedValue;
            if (proposedValue === null)
                return null;
            const value = isInstanceOf(proposedValue, Entity) ? proposedValue : me.resolve(proposedValue);
            if (value && me.hasBucket()) {
                me.getBucket(value).addToBucket(transaction, me.self);
            }
            return value;
        }
        resolve(locator) {
            const resolver = this.field.resolver;
            return resolver ? resolver.call(this.self, locator) : null;
        }
        leaveGraph(graph) {
            if (this.hasBucket()) {
                // here we only need to remove from the "previous", "stable" bucket, because
                // the calculation for the removed reference won't be called - the possible `proposedValue` of reference will be ignored
                const value = graph.activeTransaction.readProposedOrPrevious(this);
                if (value instanceof Entity) {
                    this.getBucket(value).removeFromBucket(graph.activeTransaction, this.self);
                }
            }
            super.leaveGraph(graph);
        }
        write(me, transaction, q, proposedValue) {
            const quark = q || transaction.acquireQuarkIfExists(me);
            if (me.hasBucket()) {
                if (quark) {
                    const prevValue = quark.getValue();
                    if (prevValue instanceof Entity) {
                        me.getBucket(prevValue).removeFromBucket(transaction, me.self);
                    }
                }
                else if (transaction.baseRevision.hasIdentifier(me)) {
                    const value = transaction.baseRevision.read(me, transaction.graph);
                    if (value instanceof Entity) {
                        me.getBucket(value).removeFromBucket(transaction, me.self);
                    }
                }
            }
            // we pass the `q` to super and not `quark`, because we don't do `getWriteTarget` (which increment the epoch)
            // but only `acquireQuarkIfExists` (which does not)
            super.write(me, transaction, q, proposedValue);
        }
    }
    __decorate([
        prototypeValue(Levels.DependsOnlyOnUserInput)
    ], ReferenceIdentifier.prototype, "level", void 0);
    __decorate([
        prototypeValue(QuarkSync)
    ], ReferenceIdentifier.prototype, "quarkClass", void 0);
    return ReferenceIdentifier;
}) {
}
export class MinimalReferenceIdentifier extends ReferenceIdentifier.mix(FieldIdentifier.mix(CalculatedValueSync)) {
}
