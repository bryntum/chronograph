import {HasId} from "../../src/chronograph/HasId.js";
import {Base} from "../../src/class/Mixin.js";
import {WalkableBackwardNode, WalkableForwardNode} from "../../src/graph/Node.js";
import {Walkable, WalkableBackward, WalkableForward, WalkBackwardContext, WalkForwardContext} from "../../src/graph/Walkable.js";

declare const StartTest : any

const WalkerForward     = WalkableForwardNode(HasId(WalkableForward(Walkable(Base))))
type WalkerForward      = InstanceType<typeof WalkerForward>

const WalkerBackward    = WalkableBackwardNode(HasId(WalkableBackward(Walkable(Base))))
type WalkerBackward     = InstanceType<typeof WalkerBackward>


StartTest(t => {

    t.it('Minimal walk forward', t => {
        const node5     = WalkerForward.new({ id : 5 })
        const node4     = WalkerForward.new({ id : 4 })
        const node3     = WalkerForward.new({ id : 3 })
        const node2     = WalkerForward.new({ id : 2 })
        const node1     = WalkerForward.new({ id : 1 })

        node3.addEdgeTo(node5)
        node4.addEdgeTo(node3)
        node2.addEdgesTo([ node3, node4 ].reverse())
        node1.addEdgeTo(node2)


        const walkPath  = []
        const topoPath  = []

        node1.walkDepth(WalkForwardContext.new({
            onNode : (node : WalkerForward) => {
                walkPath.push(node.id)
            },

            onTopologicalNode : (node : WalkerForward) => {
                topoPath.push(node.id)
            }
        }))

        t.isDeeply(walkPath, [ 1, 2, 3, 5, 4 ], 'Correct walk path')
        t.isDeeply(topoPath, [ 5, 3, 4, 2, 1 ], 'Correct topo path')
    })


    t.it('Walk with cycle forward', t => {
        const node3     = WalkerForward.new({ id : 3 })
        const node2     = WalkerForward.new({ id : 2 })
        const node1     = WalkerForward.new({ id : 1 })

        node3.addEdgeTo(node1)
        node2.addEdgeTo(node3)
        node1.addEdgeTo(node2)

        const walkPath  = []

        let cycleFound  = false

        node1.walkDepth(WalkForwardContext.new({
            onNode : (node : WalkerForward) => {
                walkPath.push(node.id)
            },

            onCycle : (node : WalkerForward) => {
                cycleFound  = true

                t.isDeeply(walkPath, [ 1, 2, 3 ], 'Correct walk path')

                t.is(node, node1, 'Cycle points to node1')
            }
        }))

        t.ok(cycleFound, "Cycle found")
    })


    t.it('Minimal walk backward', t => {
        const node5     = WalkerBackward.new({ id : 5 })

        const node3     = WalkerBackward.new({ id : 3 })
        const node4     = WalkerBackward.new({ id : 4 })
        const node2     = WalkerBackward.new({ id : 2 })

        const node1     = WalkerBackward.new({ id : 1 })

        node5.addEdgeFrom(node3)

        node3.addEdgesFrom([ node2, node4 ].reverse())
        node4.addEdgeFrom(node2)
        node2.addEdgeFrom(node1)

        const walkPath  = []
        const topoPath  = []

        node5.walkDepth(WalkBackwardContext.new({
            onNode : (node : WalkerBackward) => {
                walkPath.push(node.id)
            },

            onTopologicalNode : (node : WalkerBackward) => {
                topoPath.push(node.id)
            }
        }))

        t.isDeeply(walkPath, [ 5, 3, 2, 1, 4 ], 'Correct walk path')
        t.isDeeply(topoPath, [ 1, 2, 4, 3, 5 ], 'Correct topo path')
    })


    t.it('Walk with cycle backward', t => {
        const node1     = WalkerBackward.new({ id : 1 })
        const node2     = WalkerBackward.new({ id : 2 })
        const node3     = WalkerBackward.new({ id : 3 })

        node1.addEdgeFrom(node2)
        node2.addEdgeFrom(node3)
        node3.addEdgeFrom(node1)


        const walkPath  = []

        let cycleFound  = false

        node1.walkDepth(WalkBackwardContext.new({
            onNode : (node : WalkerBackward) => {
                walkPath.push(node.id)
            },

            onCycle : (node : WalkerBackward) => {
                cycleFound  = true

                t.isDeeply(walkPath, [ 1, 2, 3 ], 'Correct walk path')

                t.is(node, node1, 'Cycle points to node1')
            }
        }))

        t.ok(cycleFound, "Cycle found")
    })


})
