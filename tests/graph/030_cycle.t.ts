import { HasId } from "../../src/chrono/HasId.js"
import { Base } from "../../src/class/Mixin.js"
import { MinimalNode } from "../../src/graph/Node.js"
import { cycleInfo, OnCycleAction, Walkable, WalkForwardContext, WalkStep } from "../../src/graph/Walkable.js"
import { calculate, Entity, field } from "../../src/replica/Entity.js"
import { MinimalReplica } from "../../src/replica/Replica.js"

declare const StartTest : any

class NodeWithId extends HasId(MinimalNode) {}

StartTest(t => {

    t.it('Cycle detection #1', t => {
        const node1     = NodeWithId.new({ id : 1 })
        const node2     = NodeWithId.new({ id : 2 })

        node1.addEdgeTo(node2)
        node2.addEdgeTo(node1)

        let cycle : Walkable[]

        node1.walkDepth(WalkForwardContext.new({
            onCycle : (node : NodeWithId, stack : WalkStep[]) : OnCycleAction => {
                cycle   = cycleInfo(stack)

                return OnCycleAction.Cancel
            }
        }))

        t.isDeeply(cycle, [ node1, node2, node1 ], 'Correct cycle path')
    })


    t.it('Cycle detection #2', t => {
        const node1     = NodeWithId.new({ id : 1 })
        const node2     = NodeWithId.new({ id : 2 })
        const node3     = NodeWithId.new({ id : 3 })
        const node4     = NodeWithId.new({ id : 4 })
        const node5     = NodeWithId.new({ id : 5 })

        node1.addEdgeTo(node2)
        node2.addEdgeTo(node3)
        node3.addEdgeTo(node4)
        node4.addEdgeTo(node2)
        node3.addEdgeTo(node5)

        let cycle : Walkable[]

        node1.walkDepth(WalkForwardContext.new({
            onCycle : (node : NodeWithId, stack : WalkStep[]) : OnCycleAction => {
                cycle   = cycleInfo(stack)

                return OnCycleAction.Cancel
            }
        }))

        t.isDeeply(cycle, [ node2, node3, node4, node2 ], 'Correct cycle path')
    })


    t.it('Cycle detection #3', t => {
        const node1     = NodeWithId.new({ id : 1 })
        const node2     = NodeWithId.new({ id : 2 })
        const node3     = NodeWithId.new({ id : 3 })
        const node4     = NodeWithId.new({ id : 4 })
        const node5     = NodeWithId.new({ id : 5 })
        const node6     = NodeWithId.new({ id : 6 })
        const node7     = NodeWithId.new({ id : 7 })
        const node8     = NodeWithId.new({ id : 8 })
        const node9     = NodeWithId.new({ id : 9 })
        const node10    = NodeWithId.new({ id : 10 })
        const node11    = NodeWithId.new({ id : 11 })

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

        let cycle : Walkable[]

        node1.walkDepth(WalkForwardContext.new({
            onCycle : (node : NodeWithId, stack : WalkStep[]) : OnCycleAction => {
                cycle   = cycleInfo(stack)

                return OnCycleAction.Cancel
            }
        }))

        t.isDeeply(cycle, [ node2, node3, node4, node2 ], 'Correct cycle path')
    })

    t.it('Cycle vizualization', async t => {

        class CircSum extends Entity(Base) {
            @field()
            pointA : number

            @field()
            pointB : number

            @field()
            pointC : number

            @calculate('pointA')
            * calcPointA (proposedValue? : number) {
                return (yield this.$.pointB) + (yield this.$.pointC)
            }

            @calculate('pointB')
            * calcPointB (proposedValue? : number) {
                return (yield this.$.pointA) + (yield this.$.pointC)
            }

            @calculate('pointC')
            * calcPointC (proposedValue? : number) {
                return (yield this.$.pointA) + (yield this.$.pointB)
            }
        }

        const replica = MinimalReplica.new()

        const sum = CircSum.new({ pointA : 1, pointB : 2, pointC : 3 })

        replica.addEntity(sum)

        try {
            const result = await replica.propagate()
        }
        catch (e) {
            t.like(e.message.toLowerCase(), 'cycle', 'Got cycle exception')
            t.like(replica.toDotOnCycleException(), 'penwidth=5', 'Cycle seems to be drawn')
        }
    })

})
