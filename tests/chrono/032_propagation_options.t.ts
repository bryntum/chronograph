import { ChronoGraph, MinimalChronoGraph } from "../../src/chrono/Graph.js"
import { MinimalQuark } from "../../src/chrono/Quark.js"

declare const StartTest : any

StartTest(t => {

    t.it('Should not recalculate nodes outside of affected scope', async t => {
        const graph : ChronoGraph       = MinimalChronoGraph.new()

        const box1      = graph.variable(0)
        const box2      = graph.variable(0)

        const iden1     = graph.identifier(function * () {
            return (yield box1) + (yield box2)
        })

        const box3      = graph.variable(1)

        const iden2    = graph.identifier(function * () {
            return (yield iden1) + (yield box3)
        })

        // ----------------
        const calculation1Spy   = t.spyOn(iden1, 'calculation')
        const calculation2Spy   = t.spyOn(iden2, 'calculation')

        graph.propagate({ calculateOnly : [ iden1 ] })

        t.is(graph.read(iden1), 0, "Correct result calculated")
        t.is(graph.read(iden2), 1, "Correct result calculated")

        t.expect(calculation1Spy).toHaveBeenCalled(1)
        t.expect(calculation2Spy).toHaveBeenCalled(1)

        // ----------------
        calculation1Spy.reset()
        calculation2Spy.reset()

        graph.write(box1, 10)

        graph.propagate()

        t.is(graph.read(iden1), 10, "Correct result calculated")
        t.is(graph.read(iden2), 11, "Correct result calculated")

        t.expect(calculation1Spy).toHaveBeenCalled(1)
        t.expect(calculation2Spy).toHaveBeenCalled(1)


        // ----------------
        calculation1Spy.reset()
        calculation2Spy.reset()

        graph.write(box3, 2)

        graph.propagate()

        t.is(graph.read(iden1), 10, "Correct result calculated")
        t.is(graph.read(iden2), 12, "Correct result calculated")

        t.expect(calculation1Spy).toHaveBeenCalled(0)
        t.expect(calculation2Spy).toHaveBeenCalled(1)
    })
})
