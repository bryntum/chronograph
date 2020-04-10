// import { Base } from "../../src/class/BetterMixin.js"
// import { Replica } from "../../src/replica/Replica.js"
// import { TreeNode } from "../../src/replica/TreeNode.js"
//
// declare const StartTest : any
//
// StartTest(t => {
//
//     t.it('TreeNode w/o propagate', async t => {
//
//         class TreeNodeBase extends TreeNode.derive(Base) {}
//
//         const replica1          = Replica.new()
//         const node1             = TreeNodeBase.new()
//
//         replica1.addEntity(node1)
//
//         t.isDeeply(node1.childrenOrdered.children, new Set([]), 'Correctly resolved `children` reference')
//
//         const node2             = TreeNodeBase.new({ parent : node1, nextSibling : null })
//         const node3             = TreeNodeBase.new({ parent : node1, nextSibling : null })
//         const node4             = TreeNodeBase.new({ parent : node1, previousSibling : null })
//         const node5             = TreeNodeBase.new({ parent : node1, nextSibling : node3 })
//         const node6             = TreeNodeBase.new({ parent : node1, nextSibling : node5 })
//
//         replica1.addEntities([ node2, node3, node4, node5, node6 ])
//
//         t.isDeeply(node1.childrenOrdered, [ node4, node2, node6, node5, node3 ], 'Correctly resolved `children` reference')
//     })
// })
