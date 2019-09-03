import { MinimalNode, WalkForwardContext } from "../../src/graph/Node.js"

declare const StartTest : any

class WalkerNode extends MinimalNode {
    id          : number
}


StartTest(t => {

    t.it('Minimal walk forward with "duplex" nodes', t => {
        const node5     = WalkerNode.new({ name : 5 })
        const node4     = WalkerNode.new({ name : 4 })
        const node3     = WalkerNode.new({ name : 3 })
        const node2     = WalkerNode.new({ name : 2 })
        const node1     = WalkerNode.new({ name : 1 })

        node3.addEdgeTo(node5)
        node4.addEdgeTo(node3)
        node2.addEdgeTo(node4)
        node2.addEdgeTo(node3)
        node1.addEdgeTo(node2)

        const walkPath  = []
        const topoPath  = []

        WalkForwardContext.new({
            onNode : (node : WalkerNode) => {
                walkPath.push(node.name)
            },

            onTopologicalNode : (node : WalkerNode) => {
                topoPath.push(node.name)
            }
        }).startFrom([ node1 ])

        t.isDeeply(walkPath, [ 1, 2, 3, 5, 4 ], 'Correct walk path')
        t.isDeeply(topoPath, [ 5, 3, 4, 2, 1 ], 'Correct topo path')
    })

})
