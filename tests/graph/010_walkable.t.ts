import { Base } from "../../src/class/Mixin.js"
import { WalkableBackward, WalkableBackwardNode, WalkableForwardNode, WalkBackwardContext, WalkForwardContext } from "../../src/graph/Node.js"

declare const StartTest : any

class WalkerForwardNode extends WalkableForwardNode(Base) {
    id              : number
    NodeT           : WalkableForwardNode
    outgoing        : Map<this[ 'NodeT' ], this[ 'LabelT' ]>   = new Map()
}
class WalkerBackwardNode extends WalkableBackwardNode(Base) {
    id              : number
    NodeT           : WalkableBackwardNode
    incoming        : Map<this[ 'NodeT' ], this[ 'LabelT' ]>   = new Map()
}


// For optimization purposes, walker FIRST goes into the LAST "next" walkable node in the `forEachNext`
// so we reverse to get the "expected" order
const edges = <T extends WalkableForwardNode | WalkableBackward>(...nodes : T[]) => new Map(nodes.reverse().map(node => [ node, null ]))

StartTest(t => {

    t.it('Minimal walk forward', t => {
        const node5     = WalkerForwardNode.new({ id : 5, outgoing : edges<WalkableForwardNode>() })

        const node3     = WalkerForwardNode.new({ id : 3, outgoing : edges(node5) })
        const node4     = WalkerForwardNode.new({ id : 4, outgoing : edges(node3) })
        const node2     = WalkerForwardNode.new({ id : 2, outgoing : edges(node3, node4) })

        const node1     = WalkerForwardNode.new({ id : 1, outgoing : edges(node2) })

        const walkPath  = []
        const topoPath  = []

        WalkForwardContext.new({
            onNode : (node : WalkerForwardNode) => {
                walkPath.push(node.id)
            },

            onTopologicalNode : (node : WalkerForwardNode) => {
                topoPath.push(node.id)
            }
        }).startFrom([ node1 ])

        // For optimization purposes, walker FIRST goes into the LAST "next" walkable node in the `forEachNext`
        t.isDeeply(walkPath, [ 1, 2, 3, 5, 4 ], 'Correct walk path')
        t.isDeeply(topoPath, [ 5, 3, 4, 2, 1 ], 'Correct topo path')
    })


    t.it('Walk with cycle forward', t => {
        const node1     = WalkerForwardNode.new({ id : 1 })
        const node2     = WalkerForwardNode.new({ id : 2 })
        const node3     = WalkerForwardNode.new({ id : 3 })

        node1.addEdgeTo(node2)
        node2.addEdgeTo(node3)
        node3.addEdgeTo(node1)

        const walkPath  = []

        let cycleFound  = false

        WalkForwardContext.new({
            onNode : (node : WalkerForwardNode) => {
                walkPath.push(node.id)
            },

            onCycle : (node : WalkerForwardNode) : any => {
                cycleFound  = true

                t.isDeeply(walkPath, [ 1, 2, 3 ], 'Correct walk path')

                t.is(node, node1, 'Cycle points to node1')
            }
        }).startFrom([ node1 ])

        t.ok(cycleFound, "Cycle found")
    })


    t.it('Minimal walk backward', t => {
        const node1     = WalkerBackwardNode.new({ id : 1, incoming : edges() })
        const node2     = WalkerBackwardNode.new({ id : 2, incoming : edges(node1) })
        const node4     = WalkerBackwardNode.new({ id : 4, incoming : edges(node2) })
        const node3     = WalkerBackwardNode.new({ id : 3, incoming : edges(node2, node4) })
        const node5     = WalkerBackwardNode.new({ id : 5, incoming : edges(node3) })

        const walkPath  = []
        const topoPath  = []

        WalkBackwardContext.new({
            onNode : (node : WalkerBackwardNode) => {
                walkPath.push(node.id)
            },

            onTopologicalNode : (node : WalkerBackwardNode) => {
                topoPath.push(node.id)
            }
        }).startFrom([ node5 ])

        t.isDeeply(walkPath, [ 5, 3, 2, 1, 4 ], 'Correct walk path')
        t.isDeeply(topoPath, [ 1, 2, 4, 3, 5 ], 'Correct topo path')
    })


    t.it('Walk with cycle backward', t => {
        const node1     = WalkerBackwardNode.new({ id : 1 })
        const node2     = WalkerBackwardNode.new({ id : 2 })
        const node3     = WalkerBackwardNode.new({ id : 3 })

        node1.addEdgeFrom(node2)
        node2.addEdgeFrom(node3)
        node3.addEdgeFrom(node1)

        const walkPath  = []

        let cycleFound  = false

        WalkBackwardContext.new({
            onNode : (node : WalkerBackwardNode) => {
                walkPath.push(node.id)
            },

            onCycle : (node : WalkerBackwardNode) : any => {
                cycleFound  = true

                t.isDeeply(walkPath, [ 1, 2, 3 ], 'Correct walk path')

                t.is(node, node1, 'Cycle points to node1')
            }
        }).startFrom([ node1 ])

        t.ok(cycleFound, "Cycle found")
    })
})

