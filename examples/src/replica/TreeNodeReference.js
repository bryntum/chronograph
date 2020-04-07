var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { CalculatedValueSync, Levels } from "../chrono/Identifier.js";
import { Quark } from "../chrono/Quark.js";
import { identity, isInstanceOf, Mixin } from "../class/BetterMixin.js";
import { CalculationSync } from "../primitives/Calculation.js";
import { Field } from "../schema/Field.js";
import { prototypeValue } from "../util/Helpers.js";
import { generic_field } from "./Entity.js";
import { FieldIdentifier } from "./Identifier.js";
import { TreeNode } from "./TreeNode.js";
//---------------------------------------------------------------------------------------------------------------------
export class TreeNodeReferenceField extends Mixin([Field], (base) => class TreeNodeReferenceField extends base {
    constructor() {
        super(...arguments);
        this.identifierCls = MinimalTreeNodeReferenceIdentifier;
    }
}) {
}
//---------------------------------------------------------------------------------------------------------------------
export const reference_tree_node = (fieldConfig, fieldCls = TreeNodeReferenceField) => generic_field(fieldConfig, fieldCls);
//---------------------------------------------------------------------------------------------------------------------
export class TreeNodeReferenceIdentifier extends Mixin([FieldIdentifier], (base) => {
    class TreeNodeReferenceIdentifier extends base {
        constructor() {
            super(...arguments);
            this.field = undefined;
            this.proposedValueIsBuilt = true;
        }
        getBucket(entity) {
            return entity.$.childrenOrdered;
        }
        buildProposedValue(me, quark, transaction) {
            const proposedValue = quark.proposedValue;
            if (proposedValue === null)
                return null;
            const value = isInstanceOf(proposedValue, TreeNode) ? proposedValue : me.resolve(proposedValue);
            if (value) {
                me.getBucket(value).register(me, transaction);
            }
            return value;
        }
        resolve(locator) {
            const resolver = this.field.resolver;
            return resolver ? resolver.call(this.self, locator) : null;
        }
        leaveGraph(graph) {
            // here we only need to remove from the "previous", "stable" bucket, because
            // the calculation for the removed treeNodeReference won't be called - the possible `proposedValue` of treeNodeReference will be ignored
            const value = graph.activeTransaction.readProposedOrPrevious(this);
            if (value != null) {
                this.getBucket(value).unregister(this, graph.activeTransaction);
            }
            super.leaveGraph(graph);
        }
        write(me, transaction, quark, proposedValue) {
            quark = quark || transaction.acquireQuarkIfExists(me);
            if (quark) {
                const proposedValue = quark.proposedValue;
                if (proposedValue instanceof TreeNode) {
                    me.getBucket(proposedValue).unregister(me, transaction);
                }
            }
            else if (transaction.baseRevision.hasIdentifier(me)) {
                const value = transaction.baseRevision.read(me, transaction.graph);
                if (value != null) {
                    me.getBucket(value).unregister(me, transaction);
                }
            }
            super.write(me, transaction, quark, proposedValue);
        }
    }
    __decorate([
        prototypeValue(Levels.DependsOnlyOnUserInput)
    ], TreeNodeReferenceIdentifier.prototype, "level", void 0);
    __decorate([
        prototypeValue(Mixin([CalculationSync, Quark, Map], identity))
    ], TreeNodeReferenceIdentifier.prototype, "quarkClass", void 0);
    return TreeNodeReferenceIdentifier;
}) {
}
export class MinimalTreeNodeReferenceIdentifier extends TreeNodeReferenceIdentifier.mix(FieldIdentifier.mix(CalculatedValueSync)) {
}
