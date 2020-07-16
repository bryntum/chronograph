import { setCompactCounter } from "../../src/chrono2/atom/Node.js"
import { Box } from "../../src/chrono2/data/Box.js"
import { CalculableBox } from "../../src/chrono2/data/CalculableBox.js"
import { ChronoGraph } from "../../src/chrono2/graph/Graph.js"

declare const StartTest : any

setCompactCounter(1)

StartTest(t => {

    t.it('Undo/redo of the box value', async t => {
        const graph : ChronoGraph   = ChronoGraph.new({ historyLimit : 2 })

        const box      = new Box(0)

        graph.addAtom(box)

        graph.commit()

        t.is(box.read(), 0, 'Correct value #1')

        //--------------
        box.write(10)

        graph.commit()

        t.is(box.read(), 10, 'Correct value #2')

        //--------------
        graph.undo()

        t.is(box.read(), 0, 'Correct value #3')

        //--------------
        graph.redo()

        t.is(box.read(), 10, 'Correct value')
    })


    t.it('Undo/redo of the box value - commit after read', async t => {
        const graph : ChronoGraph   = ChronoGraph.new({ historyLimit : 2 })

        const box1     = new Box(0)

        const box2     = new CalculableBox({
            calculation : () => box1.read()  + 1
        })

        graph.addAtoms([ box1, box2 ])

        t.is(box1.read(), 0, 'Correct value #1')
        t.is(box2.read(), 1, 'Correct value #1')

        graph.commit()

        //--------------
        box1.write(10)

        t.is(box1.read(), 10, 'Correct value #2')
        t.is(box2.read(), 11, 'Correct value #2')

        graph.commit()

        //--------------
        graph.undo()

        t.is(box1.read(), 0, 'Correct value #3')
        t.is(box2.read(), 1, 'Correct value #3')

        //--------------
        graph.redo()

        t.is(box1.read(), 10, 'Correct value #4')
        t.is(box2.read(), 11, 'Correct value #4')
    })


    t.it('Undo/redo of the box value - commit in random place', async t => {
        const graph : ChronoGraph   = ChronoGraph.new({ historyLimit : 2 })

        const box1     = new Box(0)

        const box2     = new CalculableBox({
            lazy        : false,
            calculation : () => box1.read()  + 1
        })

        graph.addAtoms([ box1, box2 ])

        graph.commit()

        t.is(box1.read(), 0, 'Correct value #1')
        t.is(box2.read(), 1, 'Correct value #1')

        //--------------
        box1.write(10)

        graph.commit()

        t.is(box1.read(), 10, 'Correct value #2')
        t.is(box2.read(), 11, 'Correct value #2')

        //--------------
        graph.undo()

        t.is(box1.read(), 0, 'Correct value #3')
        t.is(box2.read(), 1, 'Correct value #3')

        //--------------
        graph.redo()

        t.is(box1.read(), 10, 'Correct value #4')
        t.is(box2.read(), 11, 'Correct value #4')
    })


    t.xit('Undo/redo of the box value - lazy atoms read', async t => {
        const graph : ChronoGraph   = ChronoGraph.new({ historyLimit : 2 })

        const box1     = new Box(0)

        const box2     = new CalculableBox({
            lazy        : false,
            calculation : () => box1.read()  + 1
        })

        graph.addAtoms([ box1, box2 ])

        graph.commit()

        t.is(box1.read(), 0, 'Correct value #1')
        t.is(box2.read(), 1, 'Correct value #1')

        //--------------
        box1.write(10)

        graph.commit()

        t.is(box1.read(), 10, 'Correct value #2')
        t.is(box2.read(), 11, 'Correct value #2')

        //--------------
        graph.undo()

        t.is(box1.read(), 0, 'Correct value #3')
        t.is(box2.read(), 1, 'Correct value #3')

        // TODO
        // the following redo does not work - because reading from the box2 right above
        // creates a new iteration and clears the undo/redo queue
        // need to figure out how to deal with this (or leave as is??)

        //--------------
        graph.redo()

        t.is(box1.read(), 10, 'Correct value #4')
        t.is(box2.read(), 11, 'Correct value #4')
    })



})
