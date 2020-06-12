import { Box } from "../../src/chrono2/data/Box.js"
import { ChronoGraph } from "../../src/chrono2/Graph.js"

declare const StartTest : any

StartTest(t => {

    t.it('Undo/redo of variable value', async t => {
        const graph : ChronoGraph   = ChronoGraph.new({ historyLimit : 2 })

        const box      = new Box(0)

        t.is(box.read(), 0, 'Correct value #1')

        graph.addAtom(box)

        t.is(box.read(), 0, 'Correct value #2')

        graph.commit()

        t.is(box.read(), 0, 'Correct value #3')

        // //--------------
        // box.write(10)
        //
        // graph.commit()
        //
        // t.is(box.read(), 10, 'Correct value')
        //
        // //--------------
        // graph.undo()
        //
        // t.is(box.read(), 0, 'Correct value')
        //
        // //--------------
        // graph.redo()
        //
        // t.is(box.read(), 10, 'Correct value')
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
