import { Transaction } from "../chrono/Transaction.js"
import { AnyConstructor, Mixin } from "../class/BetterMixin.js"
import { Base } from "../class/Mixin.js"
import { calculate, Entity, field, write } from "./Entity.js"
import { reference } from "./Reference.js"
import { bucket } from "./ReferenceBucket.js"
import { bucket_tree_node, BucketMutation, BucketMutationPosition, TreeNodeBucketQuark } from "./TreeNodeBucket.js"
import { reference_tree_node, TreeNodeReferenceIdentifier } from "./TreeNodeReference.js"

export class TreeNode extends Mixin(
    [ Entity ],
    (base : AnyConstructor<Entity, typeof Entity>) => {

    class TreeNode extends base {
        @bucket_tree_node()
        childrenOrdered     : TreeNodeBucket

        @reference({ bucket : 'children'})
        parent              : TreeNode

        @bucket()
        children            : Set<TreeNode>

        @field({ lazy : true })
        parentIndex         : number

        // @field({ lazy : true })
        // siblingPosition     : { next : TreeNode, previous : TreeNode }

        // @field({ lazy : true })
        // globalPosition      : { next : TreeNode, previous : TreeNode }
        //
        // @field({ lazy : true })
        // position            : { next : TreeNode, previous : TreeNode }

        @reference_tree_node({ refType : 'next' })
        nextSibling         : TreeNode

        @reference_tree_node({ refType : 'prev'})
        previousSibling     : TreeNode


        // @field()
        // next                : TreeNode
        //
        // @field()
        // previous            : TreeNode

        @calculate('parentIndex')
        calculateParentIndex (Y) : number {
            const previousSibling   = Y(this.$.previousSibling)

            return previousSibling ? Y(previousSibling.$.parentIndex) + 1 : 0
        }


        @write('nextSibling')
        write (me : TreeNodeReferenceIdentifier, transaction : Transaction, quark : TreeNodeBucketQuark, proposedValue : TreeNode) {
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
    return TreeNode
}){}


export class TreeNodeBucket extends Base {
    first       : TreeNode          = null
    last        : TreeNode          = null

    $children    : Set<TreeNode>    = undefined


    get children () : Set<TreeNode> {
        if (this.$children !== undefined) return this.$children

        return this.$children = new Set()
    }


    $asArray    : TreeNode[]    = undefined

    get asArray () : TreeNode[] {
        if (this.$asArray !== undefined) return this.$asArray

        return this.$asArray = Array.from(this.children)
    }


    register (mutation : BucketMutation) {
        const newNode   = mutation.node

        if (!mutation.position.previous && !mutation.position.next) {
            this.last   = this.last
        }
    }

}

