import { ChronoGraph } from "../../src/chrono/Graph.js"
import { CalculatedValueGen } from "../../src/chrono/Identifier.js"
import { TransactionCommitResult } from "../../src/chrono/Transaction.js"

declare const StartTest : any

StartTest(t => {

    t.it('Should be able to write to graph in the `finalizeCommitAsync`', async t => {
        class CustomGraph extends ChronoGraph {

            async finalizeCommitAsync (transactionResult : TransactionCommitResult) {
                if (await graph.readAsync(c1) > 10) {
                    graph.write(i1, 3)
                    graph.write(i2, 3)
                }

                await super.finalizeCommitAsync(transactionResult)
            }
        }

        const graph : CustomGraph       = CustomGraph.new({ onWriteDuringCommit : 'ignore' })

        const i1        = graph.variableNamed('i1', 0)
        const i2        = graph.variableNamed('i2', 10)

        const c1        = graph.addIdentifier(CalculatedValueGen.new({
            name        : 'c1',
            sync        : false,
            calculation : function* () {
                return (yield i1) + (yield i2)
            }
        }))

        await graph.commitAsync()

        // ----------------
        const nodes             = [ i1, i2, c1 ]

        t.isDeeply(nodes.map(node => graph.get(node)), [ 0, 10, 10 ], "Correct result calculated #1")

        // ----------------
        graph.write(i1, 7)
        graph.write(i2, 8)

        await graph.commitAsync()

        t.isDeeply(nodes.map(node => graph.get(node)), [ 3, 3, 6 ], "Correct result calculated #1")
    })
})

