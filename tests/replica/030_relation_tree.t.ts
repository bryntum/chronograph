import {Base} from "../../src/class/Mixin.js";
import {EntityAny, EntityBase, reference, storage} from "../../src/replica/Entity.js";
import {MinimalReplica} from "../../src/replica/Replica.js";
import {Schema} from "../../src/schema/Schema.js";

declare const StartTest : any

StartTest(t => {

    t.it('Replica', t => {
        const SomeSchema        = Schema.new({ name : 'Cool data schema' })

        const entity            = SomeSchema.getEntityDecorator()

        @entity
        class TreeNode extends EntityBase(EntityAny(Base)) {
            @storage
            children            : Set<TreeNode>

            @reference(TreeNode, 'children')
            parent              : TreeNode
        }

        const replica1          = MinimalReplica.new({ schema : SomeSchema })

        const node1             = TreeNode.new()
        const node2             = TreeNode.new({ parent : node1 })
        const node3             = TreeNode.new({ parent : node1 })
        const node4             = TreeNode.new({ parent : node2 })

        replica1.addEntities([ node1, node2, node3, node4 ])

        replica1.propagateWalkDepth()

        t.isDeeply(node1.children, new Set([ node2, node3 ]), 'Correctly resolved `children` reference')
        t.isDeeply(node2.children, new Set([ node4 ]), 'Correctly resolved `children` reference')
        t.isDeeply(node3.children, new Set(), 'Correctly resolved `children` reference')
        t.isDeeply(node4.children, new Set(), 'Correctly resolved `children` reference')
    })

})
