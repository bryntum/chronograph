import { ChronoGraph, MinimalChronoGraph } from "../../src/chrono/Graph.js"

declare const StartTest : any

StartTest(t => {

    t.it('Graph cloning', async t => {
        const graph1 : ChronoGraph   = MinimalChronoGraph.new()

        const var1      = graph1.variable(0)

        graph1.propagate()

        t.isDeeply(graph1.read(var1), 0, 'Correct value')

        const graph2    = graph1.branch()

        t.isDeeply(graph2.read(var1), 0, 'Correct value')

        graph2.write(var1, 1)

        graph2.propagate()

        t.isDeeply(graph1.read(var1), 0, 'Correct value')
        t.isDeeply(graph2.read(var1), 1, 'Correct value')
    })


    t.iit('Cross-branch unchanged trees elimination', async t => {
        const graph1 : ChronoGraph       = MinimalChronoGraph.new()

        const i1            = graph1.variableId('i1', 0)
        const i2            = graph1.variableId('i2', 1)
        const dispatcher    = graph1.variableId('dispatcher', i1)

        const c1            = graph1.identifierId('c1', function* () {
            return (yield (yield dispatcher)) + 1
        })

        graph1.propagate()

        const graph2    = graph1.branch()

        graph2.write(dispatcher, i2)

        const c1Spy         = t.spyOn(c1, 'calculation')

        graph2.propagate()

        t.expect(c1Spy).toHaveBeenCalled(1)

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph1.read(node)), [ 0, 1, i1, 1 ], "Correct result calculated")
        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph2.read(node)), [ 0, 1, i2, 2 ], "Correct result calculated")

        // ----------------
        c1Spy.reset()

        graph1.write(i1, 10)

        graph1.propagate()

        t.expect(c1Spy).toHaveBeenCalled(0)

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph1.read(node)), [ 10, 1, i1, 11 ], "Correct result calculated")
        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph2.read(node)), [ 0, 1, i2, 2 ], "Correct result calculated")
    })

})


