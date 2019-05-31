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


    t.it('Cross-branch unchanged trees elimination', async t => {
        const graph : ChronoGraph       = MinimalChronoGraph.new()

        const i1        = graph.variableId('i1', 0)
        const i2        = graph.variableId('i2', 10)

        const c1        = graph.identifierId('c1', function* () {
            return (yield i1) + (yield i2)
        })

        const c2        = graph.identifierId('c2', function* () {
            return (yield i1) + (yield c1)
        })

        const c3        = graph.identifierId('c3', function* () {
            return (yield c1)
        })

        const c4        = graph.identifierId('c4', function* () {
            return (yield c3)
        })

        const c5        = graph.identifierId('c5', function* () {
            return (yield c3)
        })

        const c6        = graph.identifierId('c6', function* () {
            return (yield c5) + (yield i2)
        })

        // ----------------
        const nodes             = [ i1, i2, c1, c2, c3, c4, c5, c6 ]

        const spies             = nodes.map(calculation => t.spyOn(calculation, 'calculation'))

        graph.propagate()

        t.isDeeply(nodes.map(node => graph.read(node)), [ 0, 10, 10, 10, 10, 10, 10, 20 ], "Correct result calculated")

        spies.forEach(spy => t.expect(spy).toHaveBeenCalled(1))

        // ----------------
        spies.forEach(spy => spy.reset())

        graph.write(i1, 5)
        graph.write(i2, 5)

        graph.propagate()

        t.isDeeply(nodes.map(node => graph.read(node)), [ 5, 5, 10, 15, 10, 10, 10, 15 ], "Correct result calculated")

        const expectedCalls     = [ 1, 1, 1, 1, 0, 0, 0, 1 ]

        spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled(expectedCalls[ index ]))
    })

})


