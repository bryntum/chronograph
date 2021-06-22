import { setCompactCounter } from "../../src/chrono2/atom/Node.js"
import { CalculationIterator } from "../../src/chrono2/CalculationMode.js"
import { Box, BoxUnbound } from "../../src/chrono2/data/Box.js"
import { CalculableBoxGen, CalculableBoxGenUnbound } from "../../src/chrono2/data/CalculableBoxGen.js"
import { ChronoGraph } from "../../src/chrono2/graph/Graph.js"
import { delay } from "../../src/util/Helpers.js"

declare const StartTest : any

setCompactCounter(1)

const randomDelay = () => delay(Math.random() * 100)


StartTest(t => {

    t.it('Should trigger auto-commit', async t => {
        const box1      = BoxUnbound.new(10)

        let counter2    = 0
        const box2      = CalculableBoxGenUnbound.new({
            lazy        : false,

            *calculation () : CalculationIterator<number> {
                counter2++

                return (yield box1) + 1
            }
        })

        let counter3    = 0
        const box3     = CalculableBoxGenUnbound.new({
            lazy        : true,
            *calculation () : CalculationIterator<number> {
                counter3++

                return (yield box2) + 1
            }
        })

        let counter4    = 0
        const box4     = CalculableBoxGenUnbound.new({
            lazy        : false,
            *calculation () : CalculationIterator<number> {
                counter4++

                return box4.readProposedOrPrevious()
            }
        })


        const graph     = ChronoGraph.new({ autoCommit : true })

        graph.addAtoms([ box1, box2, box3, box4 ])

        await delay(10)

        t.isDeeply([ counter2, counter3, counter4 ], [ 1, 0, 1 ])

        //----------------
        counter2 = counter3 = counter4 = 0

        box1.write(100)

        await delay(10)

        t.isDeeply([ counter2, counter3, counter4 ], [ 1, 0, 0 ])

        //----------------
        counter2 = counter3 = counter4 = 0

        box4.write(100)

        await delay(10)

        t.isDeeply([ counter2, counter3, counter4 ], [ 0, 0, 1 ])
    })
})
