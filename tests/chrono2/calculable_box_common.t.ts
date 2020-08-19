import { setCompactCounter } from "../../src/chrono2/atom/Node.js"
import { Box } from "../../src/chrono2/data/Box.js"
import { GraphGen } from "../util.js"

declare const StartTest : any

setCompactCounter(1)

StartTest(t => {

    const doTest = (t : any, graphGen : GraphGen) => {
        const prefix    = graphGen.sync ? 'SYNC: ' : 'GEN: '

        t.it(prefix + "Should be possible to calculate the value of the box", t => {
            const context = {}

            const box     = graphGen.calculableBox({
                calculation : eval(graphGen.calc(function* () {
                    t.is(this, context, 'Correct context')
                    return 11
                })),
                context
            })

            t.is(box.read(), 11)
        })


        t.it(prefix + "Should be possible to observe the value of the box in calculable box", t => {
            const box1     = new Box(10)

            const box2     = graphGen.calculableBox({
                calculation : eval(graphGen.calc(function* () {
                    return (yield box1)  + 1
                }))
            })

            t.is(box2.read(), 11)

            box1.write(20)

            t.is(box2.read(), 21)
        })


        t.it(prefix + "Should be possible to observe the value of the calculable box in another calculable box", t => {
            const box1     = new Box(10)

            const box2     = graphGen.calculableBox({
                calculation : eval(graphGen.calc(function* () {
                    return (yield box1)  + 1
                }))
            })

            const box3     = graphGen.calculableBox({
                calculation : eval(graphGen.calc(function* () {
                    return (yield box2)  + 1
                }))
            })

            t.is(box2.read(), 11)
            t.is(box3.read(), 12)

            box1.write(20)

            t.is(box2.read(), 21)
            t.is(box3.read(), 22)
        })


        t.it(prefix + "`undefined` as a result of calculation should be converted to `null`", t => {
            let called = false

            const box1     = graphGen.calculableBox({
                calculation : eval(graphGen.calc(function* () {
                    called = true

                    return undefined
                }))
            })

            t.isStrict(box1.read(), null, 'Undefined normalized to `null` in sync identifier')

            t.ok(called)
        })


        t.it(prefix + "Should track dependencies correctly", t => {
            const box0      = new Box(0)
            const box00     = new Box(0)

            const box1 = graphGen.calculableBox({
                name        : 'box1',
                calculation : eval(graphGen.calc(function* () {
                    return (yield box0) + 1
                }))
            })

            const box2 = graphGen.calculableBox({
                name        : 'box2',
                calculation : eval(graphGen.calc(function* () {
                    return (yield box0) + 1 + (yield box00)
                }))
            })

            const box3 = graphGen.calculableBox({
                name        : 'box3',
                calculation : eval(graphGen.calc(function* () {
                    return (yield box1) + (yield box2) + 1
                }))
            })

            t.is(box3.read(), 3)

            box0.write(1)

            t.is(box3.read(), 5)

            box00.write(1)

            t.is(box3.read(), 6)
        })
    }


    doTest(t, GraphGen.new({ sync : true }))
    doTest(t, GraphGen.new({ sync : false }))


    // t.it('Should throw error on cyclic computation', async t => {
    //     const graph : ChronoGraph = ChronoGraph.new()
    //
    //     const iden1     = graph.identifier(function (Y) {
    //         return Y(iden2)
    //     })
    //
    //     const iden2     = graph.identifier(function (Y) {
    //         return Y(iden1)
    //     })
    //
    //     t.throwsOk(() => graph.read(iden1), 'Cycle')
    // })
    //
    //
    // t.it('Should throw error on cyclic computation', async t => {
    //     const graph : ChronoGraph = ChronoGraph.new()
    //
    //     const iden1     = graph.identifier(function* (Y) {
    //         return yield iden2
    //     })
    //
    //     const iden2     = graph.identifier(function* (Y) {
    //         return yield iden1
    //     })
    //
    //     t.throwsOk(() => graph.read(iden1), 'Computation cycle')
    // })
})
