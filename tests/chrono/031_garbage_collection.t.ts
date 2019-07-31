import { ChronoGraph, MinimalChronoGraph } from "../../src/chrono/Graph.js"
import { MinimalQuark } from "../../src/chrono/Quark.js"

declare const StartTest : any

StartTest(t => {

    t.it('Should garbage collect unneeded revisions', async t => {
        // explicitly set that we only keep one revision in memory - the most latest one
        const graph : ChronoGraph       = MinimalChronoGraph.new({ historyLimit : 1 })

        const box1      = graph.variable(0)
        const box2      = graph.variable(0)

        const box1p2    = graph.identifier(function * () {
            return (yield box1) + (yield box2)
        })

        const box3      = graph.variable(1)

        const res     = graph.identifier(function * () {
            return (yield box1p2) + (yield box3)
        })

        // ----------------
        graph.propagate()

        t.is(graph.baseRevision.previous, null, "No extra revisions")

        // ----------------
        graph.write(box1, 1)

        graph.propagate()

        t.is(graph.baseRevision.previous, null, "No extra revisions")
    })
})
