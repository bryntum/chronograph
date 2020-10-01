import { Base } from "../../src/class/Base.js"
import { calculate, Entity, field } from "../../src/replica2/Entity.js"
import { reference } from "../../src/replica2/Reference.js"
import { bucket } from "../../src/replica2/ReferenceBucket.js"
import { Replica } from "../../src/replica2/Replica.js"

declare const StartTest : any

StartTest(t => {

    t.it('Should show the detailed information about the cyclic computation', async t => {
        class Some extends Entity.mix(Base) {
            @field()
            iden1           : string

            @field()
            iden2           : string

            @calculate('iden1')
            * calculateIden1 () {
                return yield this.$.iden2
            }

            @calculate('iden2')
            * calculateIden2 () {
                return yield this.$.iden1
            }
        }

        const replica : Replica       = Replica.new({ autoCommit : false })

        const some = Some.new()

        replica.addEntity(some)

        // ----------------
        t.throwsOk(() => some.iden1, /iden1.*iden2/s, 'Include identifier name in the cycle info')
    })


    t.it('Should detect cycle in the branch', async t => {
        class Node extends Entity.mix(Base) {
            id              : string

            @bucket()
            outgoing        : Set<Edge>

            @bucket()
            incoming        : Set<Edge>

            @field({ lazy : false })
            value           : number

            @field({ lazy : false })
            summaryFromIncoming : number

            @calculate('summaryFromIncoming')
            * calculateSummaryFromIncoming () {
                const incoming : Set<Edge>  = yield this.$.incoming

                let sum : number = yield this.$.value

                for (const edge of incoming) {
                    const incomingNode  = yield edge.$.from

                    sum         += yield incomingNode.$.summaryFromIncoming
                }

                return sum
            }
        }

        class Edge extends Entity.mix(Base) {
            id              : string

            @reference({ bucket : 'outgoing' })
            from            : Node

            @reference({ bucket : 'incoming' })
            to              : Node
        }


        const replica : Replica       = Replica.new({ autoCommit : false, historyLimit : 0, onComputationCycle : 'throw' })

        const node1     = Node.new({ id : 'n1', value : 1 })
        const node2     = Node.new({ id : 'n2', value : 2 })

        const edge1     = Edge.new({ id : 'e1', from : node1, to : node2 })

        replica.addEntities([ node1, node2, edge1 ])

        replica.commit()

        t.is(node1.summaryFromIncoming, 1)
        t.isDeeply(node1.incoming, new Set())
        t.isDeeply(node1.outgoing, new Set([ edge1 ]))

        t.is(node2.summaryFromIncoming, 3)
        t.isDeeply(node2.incoming, new Set([ edge1 ]))
        t.isDeeply(node2.outgoing, new Set())

        //---------------
        const branch    = replica.branch({ autoCommit : false })

        const edge2     = Edge.new({ id : 'e2', from : node2, to : node1 })

        branch.addEntities([ edge2 ])

        // t.throwsOk(() => branch.commit(), 'cycle')

        t.throwsOk(() => branch.checkout(node1.$.summaryFromIncoming).read(), 'cycle')
    })

})
