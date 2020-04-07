var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Mixin } from "../class/BetterMixin.js";
import { Base } from "../class/Mixin.js";
import { calculate, Entity, field, write } from "./Entity.js";
import { reference } from "./Reference.js";
import { bucket } from "./ReferenceBucket.js";
import { bucket_tree_node } from "./TreeNodeBucket.js";
import { reference_tree_node } from "./TreeNodeReference.js";
export class TreeNode extends Mixin([Entity], (base) => {
    class TreeNode extends base {
        // @field()
        // next                : TreeNode
        //
        // @field()
        // previous            : TreeNode
        calculateParentIndex(Y) {
            const previousSibling = Y(this.$.previousSibling);
            return previousSibling ? Y(previousSibling.$.parentIndex) + 1 : 0;
        }
        write(transaction, proposedValue) {
            const previousValue = transaction.read(this.$.nextSibling);
            if (previousValue) {
            }
            if (proposedValue) {
                const previousSibling = transaction.read(proposedValue.$.previousSibling);
                if (previousSibling) {
                    transaction.write(previousSibling.$.nextSibling, proposedValue);
                }
                transaction.write(this.$.previousSibling, previousSibling);
                transaction.write(proposedValue.$.previousSibling, this);
            }
            transaction.write(this.$.nextSibling, proposedValue);
            // quark           = quark || transaction.acquireQuarkIfExists(me)
            //
            // if (quark) {
            //     const proposedValue     = quark.proposedValue
            //
            //     if (proposedValue instanceof Entity) {
            //         me.getBucket(proposedValue).removeFromBucket(transaction, me.self)
            //     }
            // }
            // else if (transaction.baseRevision.hasIdentifier(me)) {
            //     const value  = transaction.baseRevision.read(me, transaction.graph) as Entity
            //
            //     if (value != null) {
            //         me.getBucket(value).removeFromBucket(transaction, me.self)
            //     }
            // }
            //
            // super.write(me, transaction, quark, proposedValue)
        }
    }
    __decorate([
        bucket_tree_node()
    ], TreeNode.prototype, "childrenOrdered", void 0);
    __decorate([
        reference({ bucket: 'children' })
    ], TreeNode.prototype, "parent", void 0);
    __decorate([
        bucket()
    ], TreeNode.prototype, "children", void 0);
    __decorate([
        field({ lazy: true })
    ], TreeNode.prototype, "parentIndex", void 0);
    __decorate([
        reference_tree_node({ refType: 'next' })
    ], TreeNode.prototype, "nextSibling", void 0);
    __decorate([
        reference_tree_node({ refType: 'prev' })
    ], TreeNode.prototype, "previousSibling", void 0);
    __decorate([
        calculate('parentIndex')
    ], TreeNode.prototype, "calculateParentIndex", null);
    __decorate([
        write('nextSibling')
    ], TreeNode.prototype, "write", null);
    return TreeNode;
}) {
}
export class TreeNodeBucket extends Base {
    constructor() {
        super(...arguments);
        this.children = new Set();
        this.childrenArray = [];
    }
    register(mutation) {
        const mutationNode = mutation.node;
        if (this.children.has(mutationNode)) {
        }
        else {
        }
        if (!mutation.position.previous && !mutation.position.next) {
            this.last = this.last;
        }
    }
}
