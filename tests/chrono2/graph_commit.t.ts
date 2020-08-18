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


    t.it('Should calculate the graph using calculation cores correctly', t => {
        const size                      = 10

        const graph : ChronoGraph       = ChronoGraph.new({ historyLimit : 0 })

        const boxes : Box<number>[]     = [ new Box(0) ]

        for (let i = 0; i < size; i++) {
            const box   = new CalculableBox({
                lazy        : false,
                context     : boxes.length,
                calculation () : number {
                    return boxes[ this - 1 ].read() + 1
                }
            })

            boxes.push(box)

            graph.addAtom(box)
        }

        const lastBox       = boxes[ boxes.length - 1 ]

        for (let i = 1; i < 10; i++) {
            boxes[ 0 ].write(i)

            graph.commit()

            t.is(lastBox.read(), size + i)
        }
    })
})
