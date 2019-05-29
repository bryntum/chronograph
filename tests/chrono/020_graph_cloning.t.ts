import { ChronoGraph, MinimalChronoGraph } from "../../src/chrono/Graph.js"

declare const StartTest : any

StartTest(t => {

    t.it('Graph cloning', async t => {
        const graph1 : ChronoGraph   = MinimalChronoGraph.new()

        const var1      = graph1.variable(0)

        graph1.propagate()

        t.isDeeply(graph1.read(var1), 0, 'Correct value')

        const graph2    = graph1.clone()

        t.isDeeply(graph2.read(var1), 0, 'Correct value')

        graph2.write(var1, 1)

        graph2.propagate()

        t.isDeeply(graph1.read(var1), 0, 'Correct value')
        t.isDeeply(graph2.read(var1), 1, 'Correct value')
    })
})


