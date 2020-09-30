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

    t.it('Commit async should "join" ongoing commit', async t => {
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

        // start the commit 1
        const promise   = graph.commitAsync()

        // start the commit 2 and wait for its completion
        await graph.commitAsync()

        // wait for completion of commit 1
        await promise

        t.is(graph.activeAtom, undefined, 'Should clear the `activeAtom` property once all commits are done')

        t.isDeeply([ counter2, counter3 ], [ 1, 0 ])

        t.is(await box1.readAsync(), 10)
        t.is(await box2.readAsync(), 11)
        t.is(await box3.readAsync(), 12)

        //----------------
        counter2 = counter3 = 0

        box1.write(100)

        await graph.commitAsync()

        t.isDeeply([ counter2, counter3 ], [ 1, 0 ])

        t.is(box1.read(), 100)
        t.is(box2.read(), 101)
        t.is(await box3.readAsync(), 102)

        t.isDeeply([ counter2, counter3 ], [ 1, 1 ])

        t.is(graph.activeAtom, undefined, 'Should clear the `activeAtom` property once all commits are done')
    })


    t.it('Should calculate the graph using calculation cores correctly', t => {
        const size                      = 10

        const graph : ChronoGraph       = ChronoGraph.new({ historyLimit : 0 })

        const boxes : Box<number>[]     = [ new BoxUnbound(0) ]

        for (let i = 0; i < size; i++) {
            const box   = new CalculableBoxUnbound({
                lazy        : false,
                context     : boxes.length,
                calculation () : number {
                    return boxes[ this - 1 ].read() + 1
                }
            })

            boxes.push(box)
        }

        graph.addAtoms(boxes)

        const lastBox       = boxes[ boxes.length - 1 ]

        for (let i = 1; i < 5; i++) {
            boxes[ 0 ].write(i)

            graph.commit()

            t.is(lastBox.read(), size + i)
        }

        t.is(graph.activeAtom, undefined)
    })


    t.it('Should eliminate unchanged subtrees for generator boxes', t => {
        const graph     = ChronoGraph.new()

        const i1        = new BoxUnbound(0, 'i1')
        const i2        = new BoxUnbound(10, 'i2')

        const c1        = new CalculableBoxGenUnbound({
            name        : 'c1',
            lazy        : false,
            calculation : function* () : CalculationIterator<number> {
                return (yield i1) + (yield i2)
            }
        })

        const c2        = new CalculableBoxGenUnbound({
            name        : 'c2',
            lazy        : false,
            calculation : function* () : CalculationIterator<number> {
                return (yield i1) + (yield c1)
            }
        })

        const c3        = new CalculableBoxGenUnbound({
            name        : 'c3',
            lazy        : false,
            calculation : function* () : CalculationIterator<number> {
                return (yield c1)
            }
        })

        const c4        = new CalculableBoxGenUnbound({
            name        : 'c4',
            lazy        : false,
            calculation : function* () : CalculationIterator<number> {
                return (yield c3)
            }
        })

        const c5        = new CalculableBoxGenUnbound({
            name        : 'c5',
            lazy        : false,
            calculation : function* () : CalculationIterator<number> {
                return (yield c3)
            }
        })

        const c6        = new CalculableBoxGenUnbound({
            name        : 'c6',
            lazy        : false,
            calculation : function* () : CalculationIterator<number> {
                return (yield c5) + (yield i2)
            }
        })

        // ----------------
        const nodes             = [ i1, i2, c1, c2, c3, c4, c5, c6 ]

        graph.addAtoms(nodes)

        const spies             = [ c1, c2, c3, c4, c5, c6 ].map(identifier => t.spyOn(identifier, 'calculation'))

        graph.commit()

        spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 1, 1, 1, 1, 1, 1 ][ index ]))

        t.isDeeply(nodes.map(node => node.read()), [ 0, 10, 10, 10, 10, 10, 10, 20 ], "Correct result calculated")

        // ----------------
        spies.forEach(spy => spy.reset())

        i1.write(5)
        i2.write(5)

        graph.commit()

        const expectedCalls     = [ 1, 1, 0, 0, 0, 1 ]

        spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled(expectedCalls[ index ]))

        t.isDeeply(nodes.map(node => node.read()), [ 5, 5, 10, 15, 10, 10, 10, 15 ], "Correct result calculated")
    })
})
