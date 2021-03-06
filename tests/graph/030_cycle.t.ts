import { Base } from "../../src/class/Base.js"
import { Node, WalkForwardContext } from "../../src/graph/Node.js"
import { cycleInfo, OnCycleAction, WalkStep } from "../../src/graph/WalkDepth.js"

declare const StartTest : any

class WalkerNode extends Node.derive(Base) {
    NodeT           : WalkerNode
    id              : number
}

StartTest(t => {

    t.it('Cycle detection #000', t => {
        const node1     = WalkerNode.new({ id : 1 })
        node1.addEdgeTo(node1)

        const node2     = WalkerNode.new({ id : 2 })
        node2.addEdgeTo(node2)

        node1.addEdgeTo(node2)

        const cycleFound = []
        const walkPath  = []

        WalkForwardContext.new({
            onNode : (node : WalkerNode) => {
                walkPath.push(node.id)
            },

            onCycle : (node : WalkerNode, stack : WalkStep<WalkerNode>[]) : OnCycleAction => {
                cycleFound.push(cycleInfo(stack))

                return OnCycleAction.Resume
            }
        }).startFrom([ node2, node1 ])

        t.isDeeply(cycleFound, [ [ node2, node2 ], [ node1, node1 ] ], 'Correct cycle path')

        t.is(walkPath.length, 2, 'Nodes visited once')
    })


    t.it('Cycle detection #00', t => {
        const node1     = WalkerNode.new({ id : 1 })
        node1.addEdgeTo(node1)

        const node2     = WalkerNode.new({ id : 2 })
        node2.addEdgeTo(node2)

        node1.addEdgeTo(node2)

        const cycleFound = []

        WalkForwardContext.new({
            onCycle : (node : WalkerNode, stack : WalkStep<WalkerNode>[]) : OnCycleAction => {
                cycleFound.push(cycleInfo(stack))

                return OnCycleAction.Resume
            }
        }).startFrom([ node1, node2 ])

        t.isDeeply(cycleFound, [ [ node2, node2 ], [ node1, node1 ] ], 'Correct cycle path')
    })


    t.it('Cycle detection #0', t => {
        const node1     = WalkerNode.new({ id : 1 })

        node1.addEdgeTo(node1)

        const cycleFound = []

        WalkForwardContext.new({
            onCycle : (node : WalkerNode, stack : WalkStep<WalkerNode>[]) : OnCycleAction => {
                cycleFound.push(cycleInfo(stack))

                return OnCycleAction.Resume
            }
        }).startFrom([ node1 ])

        t.isDeeply(cycleFound, [ [ node1, node1 ] ], 'Correct cycle path')
    })


    t.it('Cycle detection #1', t => {
        const node1     = WalkerNode.new({ id : 1 })
        const node2     = WalkerNode.new({ id : 2 })

        node1.addEdgeTo(node2)
        node2.addEdgeTo(node1)

        const cycleFound = []

        WalkForwardContext.new({
            onCycle : (node : WalkerNode, stack : WalkStep<WalkerNode>[]) : OnCycleAction => {
                cycleFound.push(cycleInfo(stack))

                return OnCycleAction.Resume
            }
        }).startFrom([ node1 ])

        t.isDeeply(cycleFound, [ [ node1, node2, node1 ] ], 'Correct cycle path')
    })


    t.it('Cycle detection #2', t => {
        const node1     = WalkerNode.new({ id : 1 })
        const node2     = WalkerNode.new({ id : 2 })
        const node3     = WalkerNode.new({ id : 3 })
        const node4     = WalkerNode.new({ id : 4 })
        const node5     = WalkerNode.new({ id : 5 })

        node1.addEdgeTo(node2)
        node2.addEdgeTo(node3)
        node3.addEdgeTo(node4)
        node4.addEdgeTo(node2)
        node3.addEdgeTo(node5)

        const cycleFound = []

        WalkForwardContext.new({
            onCycle : (node : WalkerNode, stack : WalkStep<WalkerNode>[]) : OnCycleAction => {
                cycleFound.push(cycleInfo(stack))

                return OnCycleAction.Resume
            }
        }).startFrom([ node1 ])

        t.isDeeply(cycleFound, [ [ node2, node3, node4, node2 ] ], 'Correct cycle path')
    })


    t.it('Cycle detection #3', t => {
        const node1     = WalkerNode.new({ id : 1 })
        const node2     = WalkerNode.new({ id : 2 })
        const node3     = WalkerNode.new({ id : 3 })
        const node4     = WalkerNode.new({ id : 4 })
        const node5     = WalkerNode.new({ id : 5 })
        const node6     = WalkerNode.new({ id : 6 })
        const node7     = WalkerNode.new({ id : 7 })
        const node8     = WalkerNode.new({ id : 8 })
        const node9     = WalkerNode.new({ id : 9 })
        const node10    = WalkerNode.new({ id : 10 })
        const node11    = WalkerNode.new({ id : 11 })

        node1.addEdgeTo(node2)
        node2.addEdgeTo(node3)
        node3.addEdgeTo(node4)
        node4.addEdgeTo(node2)
        node3.addEdgeTo(node5)

        node2.addEdgeTo(node6)
        node2.addEdgeTo(node7)
        node6.addEdgeTo(node7)

        node3.addEdgeTo(node8)
        node3.addEdgeTo(node9)
        node8.addEdgeTo(node9)

        node4.addEdgeTo(node10)
        node4.addEdgeTo(node11)
        node11.addEdgeTo(node10)

        const cycleFound = []

        WalkForwardContext.new({
            onCycle : (node : WalkerNode, stack : WalkStep<WalkerNode>[]) : OnCycleAction => {
                cycleFound.push(cycleInfo(stack))

                return OnCycleAction.Resume
            }
        }).startFrom([ node1 ])

        t.isDeeply(cycleFound, [ [ node2, node3, node4, node2 ] ], 'Correct cycle path')
    })


    t.it('Resume on cycle #1', t => {
        const node1     = WalkerNode.new({ id : 1 })
        const node2     = WalkerNode.new({ id : 2 })
        const node3     = WalkerNode.new({ id : 3 })

        node1.addEdgeTo(node2)
        node2.addEdgeTo(node3)
        node2.addEdgeTo(node1)
        node3.addEdgeTo(node2)

        const cycleFound = []

        WalkForwardContext.new({
            onCycle : (node : WalkerNode, stack : WalkStep<WalkerNode>[]) : OnCycleAction => {
                cycleFound.push(cycleInfo(stack))

                return OnCycleAction.Resume
            }
        }).startFrom([ node1 ])

        t.isDeeply(cycleFound, [ [ node1, node2, node1 ], [ node2, node3, node2 ] ], "2 cycles found")
    })


    t.it('Resume on cycle #2', t => {
        const node1     = WalkerNode.new({ id : 1 })
        const node2     = WalkerNode.new({ id : 2 })
        const node3     = WalkerNode.new({ id : 3 })

        node1.addEdgeTo(node2)
        node2.addEdgeTo(node1)
        node2.addEdgeTo(node3)
        node3.addEdgeTo(node2)

        const cycleFound = []

        WalkForwardContext.new({
            onCycle : (node : WalkerNode, stack : WalkStep<WalkerNode>[]) : OnCycleAction => {
                cycleFound.push(cycleInfo(stack))

                return OnCycleAction.Resume
            }
        }).startFrom([ node1 ])

        t.isDeeply(cycleFound, [ [ node2, node3, node2 ], [ node1, node2, node1 ] ], "2 cycles found")
    })
})
