var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { CalculatedValueSync, Levels } from "../chrono/Identifier.js";
import { Quark } from "../chrono/Quark.js";
import { identity, Mixin } from "../class/BetterMixin.js";
import { CalculationSync } from "../primitives/Calculation.js";
import { Field } from "../schema/Field.js";
import { prototypeValue } from "../util/Helpers.js";
import { generic_field } from "./Entity.js";
import { FieldIdentifier } from "./Identifier.js";
//---------------------------------------------------------------------------------------------------------------------
export class TreeNodeBucketField extends Mixin([Field], (base) => class TreeNodeBucketField extends base {
    constructor() {
        super(...arguments);
        this.persistent = false;
        this.identifierCls = MinimalTreeNodeBucketIdentifier;
    }
}) {
}
//---------------------------------------------------------------------------------------------------------------------
export const bucket_tree_node = (fieldConfig, fieldCls = TreeNodeBucketField) => generic_field(fieldConfig, fieldCls);
export var BucketMutationType;
(function (BucketMutationType) {
    BucketMutationType["Add"] = "Add";
    BucketMutationType["Remove"] = "Remove";
})(BucketMutationType || (BucketMutationType = {}));
//---------------------------------------------------------------------------------------------------------------------
export class TreeNodeBucketQuark extends Mixin([Quark], (base) => class TreeNodeBucketQuark extends base {
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
//---------------------------------------------------------------------------------------------------------------------
export class TreeNodeBucketIdentifier extends Mixin([FieldIdentifier], (base) => {
    class TreeNodeBucketIdentifier extends base {
        constructor() {
            super(...arguments);
            this.proposedValueIsBuilt = true;
        }
        register(me, transaction) {
            const quark = transaction.getWriteTarget(this);
            // quark.mutations.push({
            //     type        : BucketMutationType.Add,
            //     position    : me.field.refType === 'next' ?
            //         { next : me.self, prev : undefined }
            //     :
            //         { next : undefined, prev : me.self }
            // })
            const baseRevision = transaction.baseRevision;
            if (!quark.previousValue && baseRevision.hasIdentifier(this))
                quark.previousValue = baseRevision.read(this, transaction.graph);
        }
        unregister(me, transaction) {
            const quark = transaction.getWriteTarget(this);
            // quark.mutations.push({
            //     type        : BucketMutationType.Remove,
            //     position    : me.field.refType === 'next' ?
            //         { next : me.self, previous : undefined }
            //     :
            //         { next : undefined, previous : me.self }
            // })
            const baseRevision = transaction.baseRevision;
            if (!quark.previousValue && baseRevision.hasIdentifier(this))
                quark.previousValue = baseRevision.read(this, transaction.graph);
        }
        buildProposedValue(me, quarkArg, transaction) {
            // const quark                         = quarkArg as TreeNodeBucketQuark
            //
            // const previousValue : TreeNodeBucket    = quark.previousValue
            // const newValue : TreeNodeBucket         = TreeNodeBucket.new({
            //     first       : previousValue.first,
            //     last        : previousValue.last,
            //
            //     $children   : previousValue.$children ? new Set(previousValue.$children) : undefined
            // })
            //
            // for (let i = 0; i < quark.mutations.length; i++) {
            //     const { type, position } = quark.mutations[ i ]
            //
            //     if (type === BucketMutationType.Remove) {
            //         newValue.register(entity)
            //     }
            //     else if (type === BucketMutationType.Add) {
            //         newValue.add(entity)
            //     }
            // }
            //
            // return newValue
            return;
        }
    }
    __decorate([
        prototypeValue(Levels.DependsOnlyOnDependsOnlyOnUserInput)
    ], TreeNodeBucketIdentifier.prototype, "level", void 0);
    __decorate([
        prototypeValue(Mixin([TreeNodeBucketQuark, CalculationSync, Quark, Map], identity))
    ], TreeNodeBucketIdentifier.prototype, "quarkClass", void 0);
    return TreeNodeBucketIdentifier;
}) {
}
//---------------------------------------------------------------------------------------------------------------------
export class MinimalTreeNodeBucketIdentifier extends TreeNodeBucketIdentifier.mix(FieldIdentifier.mix(CalculatedValueSync)) {
}
