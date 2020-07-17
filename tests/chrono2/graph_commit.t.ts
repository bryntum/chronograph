import { setCompactCounter } from "../../src/chrono2/atom/Node.js"
import { Box } from "../../src/chrono2/data/Box.js"
import { CalculableBox } from "../../src/chrono2/data/CalculableBox.js"
import { ChronoGraph } from "../../src/chrono2/graph/Graph.js"

declare const StartTest : any

setCompactCounter(1)

StartTest(t => {

    t.it('Commit in empty graph should do nothing', t => {
        const graph     = ChronoGraph.new()

        graph.commit()

        t.pass('Passed')
    })


    t.it('Commit should calculate strict atoms', t => {
        const box1      = new Box(10)

        let counter2    = 0
        const box2      = new CalculableBox({
            lazy        : false,
            calculation : () => {
                counter2++
                return box1.read() + 1
            }
        })

        let counter3    = 0
        const box3     = new CalculableBox({
            lazy        : true,
            calculation : () => {
                counter3++
                return box2.read() + 1
            }
        })

        const graph     = new ChronoGraph()

        graph.addAtoms([ box1, box2, box3 ])

        graph.commit()

        t.isDeeply([ counter2, counter3 ], [ 1, 0 ])

        t.is(box1.read(), 10)
        t.is(box2.read(), 11)
        t.is(box3.read(), 12)

        //----------------
        counter2 = counter3 = 0

        box1.write(100)

        graph.commit()

        t.isDeeply([ counter2, counter3 ], [ 1, 0 ])

        t.is(box1.read(), 100)
        t.is(box2.read(), 101)
        t.is(box3.read(), 102)

        t.isDeeply([ counter2, counter3 ], [ 1, 1 ])
    })
})
