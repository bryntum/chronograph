import { ChronoGraph, MinimalChronoGraph } from "../../src/chrono/Graph.js"

declare const StartTest : any

StartTest(t => {

    t.it('Add variable', async t => {
        const graph1 : ChronoGraph   = MinimalChronoGraph.new()

        const var1      = graph1.variable(0)

        t.throwsOk(() => graph1.read(var1), 'Unknown identifier')

        graph1.propagate()

        t.is(graph1.read(var1), 0, 'Correct value')

        //--------------
        const graph2    = graph1.branch()

        const var2      = graph2.variable(1)

        graph2.propagate()

        t.is(graph2.read(var2), 1, 'Correct value')

        //--------------
        t.throwsOk(() => graph1.read(var2), 'Unknown identifier', 'First branch does not know about variable in 2nd branch')
    })


    t.it('Remove variable', async t => {
        const graph1 : ChronoGraph   = MinimalChronoGraph.new()

        const var1      = graph1.variable(0)

        const iden1     = graph1.identifier(function * () {
            yield var1
        })

        t.throwsOk(() => graph1.read(var1), 'Unknown identifier')

        graph1.propagate()

        t.is(graph1.read(var1), 0, 'Correct value')

        //--------------
        const graph2    = graph1.branch()

        //--------------
        graph1.removeIdentifier(var1)

        t.is(graph1.read(var1), 0, 'Can still read the variable before the propagate happened')

        t.throwsOk(() => graph1.propagate(), 'Unknown identifier')

        //--------------
        t.is(graph2.read(var1), 0, 'Other branches not affected by removal')
    })


})
