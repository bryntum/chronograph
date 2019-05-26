import { ChronoGraph, MinimalChronoGraph } from "../../src/chrono/Graph.js"
import { Identifier, Variable } from "../../src/chrono/Quark.js"

declare const StartTest : any

StartTest(t => {

    t.it('Observe variable', async t => {
        const var1      = Variable.new()

        const graph : ChronoGraph   = MinimalChronoGraph.new()

        graph.write(var1, 0)

        const value                 = graph.read(var1)

        t.isDeeply(value, 0, 'Correct value')
    })


    t.it('Observe calculation result', async t => {
        const graph : ChronoGraph   = MinimalChronoGraph.new()

        const iden1 : Identifier    = graph.observe(function * () {
            return 1
        })

        const value                 = graph.read(iden1)

        t.isDeeply(value, 1, 'Correct value')
    })
})
