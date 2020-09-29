import { setCompactCounter } from "../../src/chrono2/atom/Node.js"
import { CalculationIterator } from "../../src/chrono2/CalculationMode.js"
import { Box, BoxUnbound } from "../../src/chrono2/data/Box.js"
import { CalculableBox, CalculableBoxUnbound } from "../../src/chrono2/data/CalculableBox.js"
import { CalculableBoxGen, CalculableBoxGenUnbound } from "../../src/chrono2/data/CalculableBoxGen.js"
import { globalContext } from "../../src/chrono2/GlobalContext.js"
import { ChronoGraph } from "../../src/chrono2/graph/Graph.js"
import { delay } from "../../src/util/Helpers.js"

declare const StartTest : any

setCompactCounter(1)

const randomDelay = () => delay(Math.random() * 100)


StartTest(t => {

    t.it('Commit in empty graph should do nothing', t => {
        const graph     = ChronoGraph.new()

        graph.commit()

        t.pass('Passed')
    })


    t.it('Should support dependency from non-graph atoms', t => {
        const box1      = new BoxUnbound(10)

        let counter2    = 0
        const box2      = new CalculableBoxUnbound({
            lazy        : false,
            calculation : () => {
                counter2++
                return box1.read() + 1
            }
        })

        let counter3    = 0
        const box3     = new CalculableBoxUnbound({
            lazy        : true,
            calculation : () => {
                counter3++
                return box2.read() + 1
            }
        })

        const graph     = ChronoGraph.new()

        // box1 not added to graph
        graph.addAtoms([ box2, box3 ])

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


    t.it('Commit should calculate strict atoms', t => {
        const box1      = new BoxUnbound(10)

        let counter2    = 0
        const box2      = new CalculableBoxUnbound({
            lazy        : false,
            calculation : () => {
                counter2++
                return box1.read() + 1
            }
        })

        let counter3    = 0
        const box3     = new CalculableBoxUnbound({
            lazy        : true,
            calculation : () => {
                counter3++
                return box2.read() + 1
            }
        })

        const graph     = ChronoGraph.new()

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


    t.it('Commit async should calculate strict atoms', async t => {
        const box1      = new BoxUnbound(10)

        let counter2    = 0
        const box2      = new CalculableBoxGenUnbound({
            lazy        : false,

            *calculation () : CalculationIterator<number> {
                counter2++

                yield randomDelay()

                return (yield box1) + 1
            }
        })

        let counter3    = 0
        const box3     = new CalculableBoxGenUnbound({
            lazy        : true,
            *calculation () : CalculationIterator<number> {
                counter3++

                yield randomDelay()

                return (yield box2) + 1
            }
        })

        const graph     = ChronoGraph.new()

        graph.addAtoms([ box1, box2, box3 ])

        await graph.commitAsync()

        t.isDeeply([ counter2, counter3 ], [ 1, 0 ])

        t.is(await box1.readAsync(), 10)
        t.is(await box2.readAsync(), 11)
        t.is(await box3.readAsync(), 12)

        //----------------
        counter2 = counter3 = 0

        box1.write(100)

        await graph.commitAsync()

        t.is(globalContext.activeAtom, undefined, 'Should clear the `activeAtom` property once the commit is done')

        t.isDeeply([ counter2, counter3 ], [ 1, 0 ])

        t.is(await box1.readAsync(), 100)
        t.is(await box2.readAsync(), 101)
        t.is(await box3.readAsync(), 102)

        t.isDeeply([ counter2, counter3 ], [ 1, 1 ])
    })


    t.it('Adding already added identifier should not overwrite the initial proposed value', async t => {
        const graph : ChronoGraph = ChronoGraph.new()

        const iden1     = new CalculableBoxGenUnbound({
            *calculation () {
                return iden1.readProposedOrPrevious()
            }
        })

        iden1.write(10)

        graph.addAtom(iden1)

        graph.addAtom(iden1)

        t.is(iden1.read(), 10, 'Initial proposed value was not overwritten')
    })
})
