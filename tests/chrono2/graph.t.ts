import { Box } from "../../src/chrono2/data/Box.js"
import { ChronoGraph } from "../../src/chrono2/Graph.js"

declare const StartTest : any

StartTest(t => {

    t.it('Should be possible to add boxes to the graph and commit/reject', t => {
        const box1      = new Box()
        box1.write(10)

        const box2      = new Box()
        box2.write(11)

        const graph     = new ChronoGraph()

        graph.addAtoms([ box1, box2 ])

        t.is(box1.read(), 10)
        t.is(box2.read(), 11)

        graph.commit()

        box1.write(20)
        box2.write(21)

        t.is(box1.read(), 20)
        t.is(box2.read(), 21)

        graph.reject()

        t.is(box1.read(), 10)
        t.is(box2.read(), 11)
    })
})
