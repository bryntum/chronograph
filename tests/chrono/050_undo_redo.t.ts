import { ChronoGraph } from "../../src/chrono/Graph.js"

declare const StartTest : any

StartTest(t => {

    t.it('Undo/redo of variable value', async t => {
        const graph1 : ChronoGraph   = ChronoGraph.new({ historyLimit : 2 })

        const var1      = graph1.variable(0)

        graph1.commit()

        t.is(graph1.read(var1), 0, 'Correct value')

        //--------------
        graph1.write(var1, 1)

        graph1.commit()

        t.is(graph1.read(var1), 1, 'Correct value')

        //--------------
        graph1.undo()

        t.is(graph1.read(var1), 0, 'Correct value')

        //--------------
        graph1.redo()

        t.is(graph1.read(var1), 1, 'Correct value')
    })


    t.it('Undo/redo of new identifier', async t => {
        const graph1 : ChronoGraph   = ChronoGraph.new({ historyLimit : 2 })

        const var1      = graph1.variable(0)

        graph1.commit()

        t.is(graph1.read(var1), 0, 'Correct value')

        //--------------
        graph1.undo()

        t.throwsOk(() => graph1.read(var1), 'Unknown identifier')

        //--------------
        graph1.redo()

        t.is(graph1.read(var1), 0, 'Correct value')
    })


    t.it('Undo/redo of identifier removal', async t => {
        const graph1 : ChronoGraph   = ChronoGraph.new({ historyLimit : 2 })

        const var1      = graph1.variable(0)

        graph1.commit()

        t.is(graph1.read(var1), 0, 'Correct value')

        //--------------
        graph1.removeIdentifier(var1)

        graph1.commit()

        t.throwsOk(() => graph1.read(var1), 'Unknown identifier')

        //--------------
        graph1.undo()

        t.is(graph1.read(var1), 0, 'Correct value')

        //--------------
        graph1.redo()

        t.throwsOk(() => graph1.read(var1), 'Unknown identifier')
    })

})
