import { setCompactCounter } from "../../src/chrono2/atom/Node.js"
import { CalculationIterator } from "../../src/chrono2/CalculationMode.js"
import { Box } from "../../src/chrono2/data/Box.js"
import { CalculableBox } from "../../src/chrono2/data/CalculableBox.js"
import { CalculableBoxGen } from "../../src/chrono2/data/CalculableBoxGen.js"
import { ChronoGraph } from "../../src/chrono2/graph/Graph.js"
import { delay } from "../../src/util/Helpers.js"

declare const StartTest : any

setCompactCounter(1)

const randomDelay = () => delay(Math.random() * 100)


StartTest(t => {

    t.it('Commit async should "join" ongoing commit', async t => {
        const box1      = new Box(10)

        let counter2    = 0
        const box2      = new CalculableBoxGen({
            lazy        : false,

            *calculation () : CalculationIterator<number> {
                counter2++

                yield randomDelay()

                return (yield box1) + 1
            }
        })

        let counter3    = 0
        const box3     = new CalculableBoxGen({
            lazy        : true,
            *calculation () : CalculationIterator<number> {
                counter3++

                yield randomDelay()

                return (yield box2) + 1
            }
        })

        const graph     = new ChronoGraph()

        graph.addAtoms([ box1, box2, box3 ])

        graph.commitAsync()

        await graph.commitAsync()

        t.isDeeply([ counter2, counter3 ], [ 1, 0 ])

        t.is(box1.read(), 10)
        t.is(box2.read(), 11)
        t.is(box3.read(), 12)

        //----------------
        counter2 = counter3 = 0

        box1.write(100)

        await graph.commitAsync()

        t.isDeeply([ counter2, counter3 ], [ 1, 0 ])

        t.is(box1.read(), 100)
        t.is(box2.read(), 101)
        t.is(await box3.readAsync(), 102)

        t.isDeeply([ counter2, counter3 ], [ 1, 1 ])
    })
})
