import { Box } from "../../src/chrono2/data/Box.js"
import { ChronoGraph } from "../../src/chrono2/Graph.js"

declare const StartTest : any

StartTest(t => {

    t.it('Undo/redo of variable value', async t => {
        const graph1 : ChronoGraph   = ChronoGraph.new({ historyLimit : 2 })

        const var1      = new Box(0)

        graph1.commit()

        t.is(var1.read(), 0, 'Correct value')

        //--------------
        var1.write(1)

        graph1.commit()

        t.is(var1.read(), 1, 'Correct value')

        //--------------
        graph1.undo()

        t.is(var1.read(), 0, 'Correct value')

        //--------------
        graph1.redo()

        t.is(var1.read(), 1, 'Correct value')
    })


    // t.it('Undo/redo of new identifier', async t => {
    //     const graph1 : ChronoGraph   = ChronoGraph.new({ historyLimit : 2 })
    //
    //     const var1      = graph1.variable(0)
    //
    //     graph1.commit()
    //
    //     t.is(graph1.read(var1), 0, 'Correct value')
    //
    //     //--------------
    //     graph1.undo()
    //
    //     t.throwsOk(() => graph1.read(var1), 'Unknown identifier')
    //
    //     //--------------
    //     graph1.redo()
    //
    //     t.is(graph1.read(var1), 0, 'Correct value')
    // })
    //
    //
    // t.it('Undo/redo of identifier removal', async t => {
    //     const graph1 : ChronoGraph   = ChronoGraph.new({ historyLimit : 2 })
    //
    //     const var1      = graph1.variable(0)
    //
    //     graph1.commit()
    //
    //     t.is(graph1.read(var1), 0, 'Correct value')
    //
    //     //--------------
    //     graph1.removeIdentifier(var1)
    //
    //     graph1.commit()
    //
    //     t.throwsOk(() => graph1.read(var1), 'Unknown identifier')
    //
    //     //--------------
    //     graph1.undo()
    //
    //     t.is(graph1.read(var1), 0, 'Correct value')
    //
    //     //--------------
    //     graph1.redo()
    //
    //     t.throwsOk(() => graph1.read(var1), 'Unknown identifier')
    // })

})
