import { ChronoGraph } from "../../src/chrono/Graph.js"

declare const StartTest : any

StartTest(t => {

    // TODO need to also test with references (something that involves different levels)


    t.it('Should be able to only calculate the specified nodes', async t => {
        const graph : ChronoGraph       = ChronoGraph.new()

        const box1      = graph.variable(1)
        const box2      = graph.variable(2)

        const iden1     = graph.identifier(function * () {
            return (yield box1) + (yield box2)
        })

        const box3      = graph.variable(3)

        const iden2     = graph.identifier(function * () {
            return (yield iden1) + (yield box3)
        })

        // ----------------
        const calculation1Spy   = t.spyOn(iden1, 'calculation')
        const calculation2Spy   = t.spyOn(iden2, 'calculation')

        graph.read(iden1)

        t.expect(calculation1Spy).toHaveBeenCalled(1)
        t.expect(calculation2Spy).toHaveBeenCalled(0)

        // ----------------
        calculation1Spy.reset()
        calculation2Spy.reset()

        t.is(graph.read(iden1), 3, "Correct result calculated")
        t.is(graph.read(iden2), 6, "Correct result calculated")

        t.expect(calculation1Spy).toHaveBeenCalled(0)
        t.expect(calculation2Spy).toHaveBeenCalled(1)
    })
})
