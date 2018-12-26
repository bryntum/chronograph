import {HasId} from "../../src/chrono/HasId.js";
import {Base} from "../../src/class/Mixin.js";
import {Walkable, WalkableBackward, WalkableForward, WalkBackwardContext, WalkForwardContext} from "../../src/graph/Walkable.js";

declare const StartTest : any

const WalkerForward     = HasId(WalkableForward(Walkable(Base)))
type WalkerForward      = InstanceType<typeof WalkerForward>

const WalkerBackward    = HasId(WalkableBackward(Walkable(Base)))
type WalkerBackward     = InstanceType<typeof WalkerBackward>


StartTest(t => {

    t.it('Minimal walk forward', t => {
        const node5     = WalkerForward.new({ id : 5, getOutgoing : () => [] })

        const node3     = WalkerForward.new({ id : 3, getOutgoing : () => [ node5 ] })
        const node4     = WalkerForward.new({ id : 4, getOutgoing : () => [ node3 ] })
        // For optimization purposes, walker goes into the last "next" walkable node from the `getOutgoing` result
        // so we use "reverse" to get what we expect
        const node2     = WalkerForward.new({ id : 2, getOutgoing : () => [ node3, node4 ].reverse() })

        const node1     = WalkerForward.new({ id : 1, getOutgoing : () => [ node2 ] })

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
        const node1     = WalkerForward.new({ id : 1, getOutgoing : () => [ node2 ] })
        const node2     = WalkerForward.new({ id : 2, getOutgoing : () => [ node3 ] })
        const node3     = WalkerForward.new({ id : 3, getOutgoing : () => [ node1 ] })

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
        const node5     = WalkerBackward.new({ id : 5, getIncoming : () => [ node3 ] })

        const node3     = WalkerBackward.new({ id : 3, getIncoming : () => [ node2, node4 ].reverse() })
        const node4     = WalkerBackward.new({ id : 4, getIncoming : () => [ node2 ] })
        const node2     = WalkerBackward.new({ id : 2, getIncoming : () => [ node1 ] })

        const node1     = WalkerBackward.new({ id : 1, getIncoming : () => [] })

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
        const node1     = WalkerBackward.new({ id : 1, getIncoming : () => [ node2 ] })
        const node2     = WalkerBackward.new({ id : 2, getIncoming : () => [ node3 ] })
        const node3     = WalkerBackward.new({ id : 3, getIncoming : () => [ node1 ] })

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
