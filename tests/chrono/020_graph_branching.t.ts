import { ChronoGraph, MinimalChronoGraph } from "../../src/chrono/Graph.js"

declare const StartTest : any

StartTest(t => {

    t.it('Graph branching', async t => {
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


    t.it('Should not recalculate nodes from previous branch', async t => {
        const graph1 : ChronoGraph       = MinimalChronoGraph.new()

        const i1            = graph1.variableId('i1', 0)
        const i2            = graph1.variableId('i2', 1)
        const dispatcher    = graph1.variableId('dispatcher', i1)

        const c1            = graph1.identifierId('c1', function* () {
            return (yield (yield dispatcher)) + 1
        })

        graph1.propagate()

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph1.read(node)), [ 0, 1, i1, 1 ], "Correct result calculated")

        const graph2    = graph1.branch()

        graph2.write(dispatcher, i2)

        const c1Spy         = t.spyOn(c1, 'calculation')

        graph2.propagate()

        t.expect(c1Spy).toHaveBeenCalled(1)

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph1.read(node)), [ 0, 1, i1, 1 ], "Original branch not affected")
        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph2.read(node)), [ 0, 1, i2, 2 ], "Correct result calculated in new branch ")

        // ----------------
        c1Spy.reset()

        graph1.write(i1, 10)

        graph1.propagate()

        t.expect(c1Spy).toHaveBeenCalled(1)

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph1.read(node)), [ 10, 1, i1, 11 ], "Correct result calculated")
        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph2.read(node)), [ 0, 1, i2, 2 ], "Correct result calculated")
    })


    t.it('Should eliminate unchanged trees, in cross-branch case', async t => {
        const graph1 : ChronoGraph       = MinimalChronoGraph.new()

        const i1        = graph1.variableId('i1', 0)
        const i2        = graph1.variableId('i2', 10)

        const c1        = graph1.identifierId('c1', function* () {
            return (yield i1) + (yield i2)
        })

        const c2        = graph1.identifierId('c2', function* () {
            return (yield i1) + (yield c1)
        })

        const c3        = graph1.identifierId('c3', function* () {
            return (yield c1)
        })

        const c4        = graph1.identifierId('c4', function* () {
            return (yield c3)
        })

        const c5        = graph1.identifierId('c5', function* () {
            return (yield c3)
        })

        const c6        = graph1.identifierId('c6', function* () {
            return (yield c5) + (yield i2)
        })

        // ----------------
        const nodes             = [ i1, i2, c1, c2, c3, c4, c5, c6 ]

        const spies             = nodes.map(calculation => t.spyOn(calculation, 'calculation'))

        graph1.propagate()

        t.isDeeply(nodes.map(node => graph1.read(node)), [ 0, 10, 10, 10, 10, 10, 10, 20 ], "Correct result calculated")

        spies.forEach(spy => t.expect(spy).toHaveBeenCalled(1))

        // ----------------
        spies.forEach(spy => spy.reset())

        const graph2            = graph1.branch()

        graph2.write(i1, 5)
        graph2.write(i2, 5)

        graph2.propagate()

        t.isDeeply(nodes.map(node => graph2.read(node)), [ 5, 5, 10, 15, 10, 10, 10, 15 ], "Correct result calculated")

        spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 1, 1, 1, 1, 0, 0, 0, 1 ][ index ]))

        // ----------------
        spies.forEach(spy => spy.reset())

        graph1.write(i1, 3)
        graph1.write(i2, 7)

        graph1.propagate()

        t.isDeeply(nodes.map(node => graph1.read(node)), [ 3, 7, 10, 13, 10, 10, 10, 17 ], "Correct result calculated")

        spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 1, 1, 1, 1, 0, 0, 0, 1 ][ index ]))
    })

})


