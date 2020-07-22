import { setCompactCounter } from "../../src/chrono2/atom/Node.js"
import { CalculationIterator } from "../../src/chrono2/CalculationMode.js"
import { Box } from "../../src/chrono2/data/Box.js"
import { CalculableBox } from "../../src/chrono2/data/CalculableBox.js"
import { CalculableBoxGen } from "../../src/chrono2/data/CalculableBoxGen.js"

declare const StartTest : any

setCompactCounter(1)

StartTest(t => {

    t.it('Should be possible to calculate the value of the box', t => {
        const context = {}

        const box     = new CalculableBoxGen({
            * calculation () {
                t.is(this, context, 'Correct context')
                return 11
            },
            context
        })

        t.is(box.read(), 11)
    })


    t.it("Should be possible to observe the value of the box in calculable box", t => {
        const box1     = new Box(10)

        const box2     = new CalculableBoxGen({
            * calculation () {
                return (yield box1) + 1
            }
        })

        t.is(box2.read(), 11)

        box1.write(20)

        t.is(box2.read(), 21)
    })


    t.it("Should be possible to observe the value of the calculable box in another calculable box", t => {
        const box1     = new Box(10)

        const box2     = new CalculableBoxGen({
            * calculation () {
                return (yield box1) + 1
            }
        })

        const box3     = new CalculableBoxGen({
            * calculation () {
                return (yield box2) + 1
            }
        })

        t.is(box2.read(), 11)
        t.is(box3.read(), 12)

        box1.write(20)

        t.is(box2.read(), 21)
        t.is(box3.read(), 22)
    })


    t.it('`undefined` as a result of calculation should be converted to `null`', t => {
        let called = false

        const box1     = new CalculableBoxGen({
            * calculation () {
                called = true

                return undefined
            }
        })

        t.isStrict(box1.read(), null, 'Undefined normalized to `null` in gen identifier')

        t.ok(called)
    })


    t.it('Should support the synchronous "reactive" stack depth of 20000 (meaning virtually unlimited)', t => {
        const stackSize = 20000

        const boxes : Box<number>[]      = [ new Box(0) ]

        for (let i = 0; i < stackSize; i++) {
            boxes.push(new CalculableBoxGen({
                context     : boxes.length,
                * calculation () : CalculationIterator<number> {
                    return (yield boxes[ this - 1 ]) + 1
                }
            }))
        }

        const lastBox       = boxes[ boxes.length - 1 ]

        t.is(lastBox.read(), stackSize)
    })


    t.it('Should support mixed calculation', async t => {
        const box1     = new Box(10)

        const box2     = new CalculableBoxGen<number>({
            * calculation () {
                return (yield box1) + 1
            }
        })

        const box3     = new CalculableBox({
            calculation () {
                return box2.read() + 1
            }
        })

        const box4     = new CalculableBoxGen<number>({
            * calculation () {
                return (yield box3) + 1
            }
        })

        const box5     = new CalculableBox({
            calculation () {
                return box4.read() + 1
            }
        })

        const boxes     = [ box1, box2, box3, box4, box5 ]

        t.isDeeply(boxes.map(box => box.read()), [ 10, 11, 12, 13, 14 ])

        box1.write(20)

        t.isDeeply(boxes.map(box => box.read()), [ 20, 21, 22, 23, 24 ])
    })


    // // t.it('Adding already added identifier should not overwrite the initial proposed value', async t => {
    // //     const graph : ChronoGraph = ChronoGraph.new()
    // //
    // //     const iden1     = graph.addIdentifier(CalculatedValueSync.new({
    // //         calculation : function (YIELD) {
    // //             return YIELD(ProposedOrPrevious)
    // //         }
    // //     }), 10)
    // //
    // //     const iden11    = graph.addIdentifier(iden1)
    // //
    // //     t.isStrict(iden1, iden11, 'Do not overwrite the already added identifier')
    // //
    // //     t.is(graph.read(iden1), 10, 'Initial proposed value was not overwritten')
    // // })
    // //
    // //
    // // t.it('Should throw error on cyclic computation', async t => {
    // //     const graph : ChronoGraph = ChronoGraph.new()
    // //
    // //     const iden1     = graph.identifier(function (Y) {
    // //         return Y(iden2)
    // //     })
    // //
    // //     const iden2     = graph.identifier(function (Y) {
    // //         return Y(iden1)
    // //     })
    // //
    // //     t.throwsOk(() => graph.read(iden1), 'Cycle')
    // // })
    // //
    // //
    // // t.it('Should throw error on cyclic computation', async t => {
    // //     const graph : ChronoGraph = ChronoGraph.new()
    // //
    // //     const iden1     = graph.identifier(function* (Y) {
    // //         return yield iden2
    // //     })
    // //
    // //     const iden2     = graph.identifier(function* (Y) {
    // //         return yield iden1
    // //     })
    // //
    // //     t.throwsOk(() => graph.read(iden1), 'Computation cycle')
    // // })


})
