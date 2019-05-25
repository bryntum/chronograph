import { HasId } from "../../src/chrono/HasId.js"
import { MinimalNode, WalkForwardNodeContext } from "../../src/graph/Node.js"

declare const StartTest : any

class WalkerNode extends HasId(MinimalNode) {}


StartTest(t => {

    t.it('Minimal walk forward with "duplex" nodes', t => {
        const node5     = WalkerNode.new({ id : 5 })
        const node4     = WalkerNode.new({ id : 4 })
        const node3     = WalkerNode.new({ id : 3 })
        const node2     = WalkerNode.new({ id : 2 })
        const node1     = WalkerNode.new({ id : 1 })

        node3.addEdgeTo(node5)
        node4.addEdgeTo(node3)
        node2.addEdgeTo(node4)
        node2.addEdgeTo(node3)
        node1.addEdgeTo(node2)

        const walkPath  = []
        const topoPath  = []

        WalkForwardNodeContext.new({
            forEachNext : (node : WalkerNode, func) => {
                walkPath.push(node.id)

                WalkForwardNodeContext.prototype.forEachNext.call(this, node, func)
            },

            onTopologicalNode : (node : WalkerNode) => {
                topoPath.push(node.id)
            }
        }).startFrom([ node1 ])

        t.isDeeply(walkPath, [ 1, 2, 3, 5, 4 ], 'Correct walk path')
        t.isDeeply(topoPath, [ 5, 3, 4, 2, 1 ], 'Correct topo path')
    })

})
