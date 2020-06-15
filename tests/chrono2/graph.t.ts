import { Box } from "../../src/chrono2/data/Box.js"
import { CalculableBox } from "../../src/chrono2/data/CalculableBox.js"
import { ChronoGraph } from "../../src/chrono2/Graph.js"

declare const StartTest : any

StartTest(t => {

    t.it('Reject before the 1st commit should nullify the values', t => {
        const box1      = new Box(10)

        const box2     = new CalculableBox({
            calculation : () => box1.read() + 1
        })

        const graph     = new ChronoGraph()

        graph.addAtoms([ box1, box2 ])

        t.is(box1.read(), 10)
        t.is(box2.read(), 11)

        graph.reject()

        t.is(box1.read(), null)
        t.is(box2.read(), null)
    })


    t.it('Reject immediately after commit should do nothing', t => {
        const box1      = new Box(10)

        const box2     = new CalculableBox({
            calculation : () => box1.read() + 1
        })

        const graph     = new ChronoGraph()

        graph.addAtoms([ box1, box2 ])

        t.is(box1.read(), 10)
        t.is(box2.read(), 11)

        graph.commit()

        graph.reject()

        t.is(box1.read(), 10)
        t.is(box2.read(), 11)
    })


    t.it('Reject should reset the state to the previous commit', t => {
        const box1      = new Box(10)

        const box2     = new CalculableBox({
            calculation : () => box1.read() + 1
        })

        const graph     = new ChronoGraph()

        graph.addAtoms([ box1, box2 ])

        t.is(box1.read(), 10)
        t.is(box2.read(), 11)

        graph.commit()

        box1.write(20)

        t.is(box1.read(), 20)
        t.is(box2.read(), 21)

        graph.reject()

        t.is(box1.read(), 10)
        t.is(box2.read(), 11)

        box1.write(20)

        t.is(box1.read(), 20)
        t.is(box2.read(), 21)

        graph.reject()

        t.is(box1.read(), 10)
        t.is(box2.read(), 11)
    })
})
