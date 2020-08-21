import { setCompactCounter } from "../../src/chrono2/atom/Node.js"
import { Box } from "../../src/chrono2/data/Box.js"
import { CalculableBox } from "../../src/chrono2/data/CalculableBox.js"
import { ChronoGraph } from "../../src/chrono2/graph/Graph.js"
import { GraphGen } from "../util.js"

declare const StartTest : any

setCompactCounter(1)

StartTest(t => {

    const doTest = (t : any, graphGen : GraphGen) => {
        const prefix    = graphGen.sync ? 'SYNC: ' : 'GEN: '

        t.it(prefix + "Should be possible to write to another box during calculation", t => {
            const var0      = new Box(0, 'var0')
            const var1      = new Box(0, 'var1')

            const varMax    = new Box(10, 'varMax')

            const idenSum   = graphGen.calculableBox({
                calculation : eval(graphGen.calc(function* () {
                    const sum : number  = (yield var0) + (yield var1)

                    const max : number  = (yield varMax)

                    if (sum > max) {
                        var0.write((yield var0) - (sum - max))
                    }

                    return sum
                }))
            })

            const spy1      = t.spyOn(idenSum, 'calculation')

            //-------------------
            t.is(idenSum.read(), 0, 'Correct value')

            t.expect(spy1).toHaveBeenCalled(1)

            //-------------------
            spy1.reset()

            var0.write(5)
            var1.write(7)

            t.is(idenSum.read(), 10, 'Correct value')
            t.is(idenSum.read(), 10, 'Correct value')

            t.expect(spy1).toHaveBeenCalled(2)

            t.is(var0.read(), 3, 'Correct value')
        })


        t.it(prefix + "Should be possible to write to another box during calculation with distant dependencies", t => {
            const box0      = new Box(1, 'box0')
            // const box00     = new Box(0, 'box00')

            const box1   = graphGen.calculableBox({
                name        : 'box1',
                calculation : eval(graphGen.calc(function* () {
                    return (yield box0) + 1
                }))
            })

            const box2   = graphGen.calculableBox({
                name        : 'box2',
                calculation : eval(graphGen.calc(function* () {
                    // if (window.DEBUG) debugger

                    const value1 = (yield box1) + 1

                    if (value1 > 10) {
                        box0.write(0)
                    }

                    return value1
                }))
            })

            const spy1      = t.spyOn(box1, 'calculation')
            const spy2      = t.spyOn(box2, 'calculation')

            t.is(box2.read(), 3)

            t.expect(spy1).toHaveBeenCalled(1)
            t.expect(spy2).toHaveBeenCalled(1)

            //-------------------
            spy1.reset()
            spy2.reset()

            // window.DEBUG = true

            box0.write(20)

            t.is(box2.read(), 2)
            t.is(box0.read(), 0)

            t.expect(spy1).toHaveBeenCalled(2)
            t.expect(spy2).toHaveBeenCalled(2)
        })


        t.it(prefix + 'Dynamic write + subtree elimination', async t => {
            const graph : ChronoGraph   = ChronoGraph.new()

            const var0      = new Box(0, 'var0')
            const var1      = new Box(0, 'var1')

            const iden1     = graphGen.calculableBox({
                name        : 'iden1',
                lazy        : false,
                calculation : eval(graphGen.calc(function* () {
                    return (yield var0) + (yield var1)
                }))
            })

            const iden2     = graphGen.calculableBox({
                name        : 'iden2',
                lazy        : false,
                calculation : eval(graphGen.calc(function* () {
                    return (yield iden1) + 1
                }))
            })

            const iden3     = graphGen.calculableBox({
                name        : 'iden3',
                lazy        : false,
                calculation : eval(graphGen.calc(function* () {
                    const value0 : number  = (yield var0)
                    const value1 : number  = (yield var1)

                    if (value1 > 5) {
                        // swap the values for `var0` and `var1`
                        var0.write(value1)
                        var1.write(value0)

                        return 1
                    }

                    return 0
                }))
            })

            graph.addAtoms([ var0, var1, iden1, iden2, iden3 ])

            const spy1      = t.spyOn(iden1, 'calculation')
            const spy2      = t.spyOn(iden2, 'calculation')
            const spy3      = t.spyOn(iden3, 'calculation')

            //-------------------
            graph.commit()

            t.expect(spy1).toHaveBeenCalled(1)
            t.expect(spy2).toHaveBeenCalled(1)
            t.expect(spy3).toHaveBeenCalled(1)

            t.is(iden2.read(), 1, 'Correct value')
            t.is(iden3.read(), 0, 'Correct value')

            //-------------------
            spy2.reset()
            spy3.reset()

            var0.write(5)
            var1.write(7)

            graph.commit()

            // even that the `iden1` may be calculated twice (depending on the order)
            // the `iden2` should be calculated once
            t.expect(spy2).toHaveBeenCalled(1)
            t.expect(spy3).toHaveBeenCalled(2)

            t.is(var0.read(), 7, 'Correct value')
            t.is(var1.read(), 5, 'Correct value')
            t.is(iden2.read(), 13, 'Correct value')
            t.is(iden3.read(), 0, 'Correct value')
        })


        t.it(prefix + 'Should not perform extra computations on graph mutation', t => {
            const box0      = new Box(0, 'box0')
            const box00     = new Box(0, 'box00')

            let count1      = 0
            const box1 : CalculableBox<number>     = graphGen.calculableBox({
                name        : 'box1',
                calculation : eval(graphGen.calc(function* () {
                    count1++
                    return (yield box0) + 1
                }))
            })

            let count11     = 0
            const box11 : CalculableBox<number>    = graphGen.calculableBox({
                name        : 'box11',
                calculation : eval(graphGen.calc(function* () {
                    count11++
                    return (yield box00) + 1
                }))
            })

            const dispatcher : Box<CalculableBox<number>> = new Box(box1, 'dispatcher')

            let count2      = 0
            const box2      = graphGen.calculableBox({
                name        : 'box2',
                calculation : eval(graphGen.calc(function* () {
                    count2++

                    const box : CalculableBox<number>      = (yield dispatcher)

                    return (yield box) + 1
                }))
            })

            t.is(box2.read(), 2)
            t.is(box11.read(), 1)

            t.is(count1, 1)
            t.is(count11, 1)
            t.is(count2, 1)

            //---------------
            count1 = count11 = count2 = 0

            box00.write(1)
            // this switches the `box2` to the different computation path
            // on that path `box2` triggers the computation of `box11` which is stale at that moment
            // once `box11` recomputes, it propagates the staleness to its derivations (`box2`),
            // which should not affect the `Calculating` state of those, because calculation of `box11`
            // has been triggered by the `box2`
            dispatcher.write(box11)

            t.is(box2.read(), 3)

            t.is(count1, 0)
            t.is(count11, 1)

            // the key assertion of the test
            t.is(count2, 1)
        })


        t.it(prefix + 'Should not perform extra computations on graph mutation (magical deps change)', t => {
            const box0      = new Box(0, 'box0')
            const box00     = new Box(0, 'box00')

            let count1      = 0
            const box1 : CalculableBox<number>     = graphGen.calculableBox({
                name        : 'box1',
                calculation : eval(graphGen.calc(function* () {
                    count1++
                    return (yield box0) + 1
                }))
            })

            let count11     = 0
            const box11 : CalculableBox<number>    = graphGen.calculableBox({
                name        : 'box11',
                calculation : eval(graphGen.calc(function* () {
                    count11++
                    return (yield box00) + 1
                }))
            })

            // `dispatcher` is not an atom intentionally - to imitate sudden, "magical"
            // dependency change
            let dispatcher = box1

            let count2      = 0
            const box2 : CalculableBox<number>     = graphGen.calculableBox({
                name        : 'box2',
                calculation : eval(graphGen.calc(function* () {
                    count2++

                    const value     = (yield dispatcher)

                    if (value > 5) {
                        debugger
                        box0.write(2)
                        dispatcher = box1
                    }

                    return value + 1
                }))
            })

            t.is(box2.read(), 2)
            t.is(box11.read(), 1)

            t.is(count1, 1)
            t.is(count11, 1)
            t.is(count2, 1)

            //---------------
            count1 = count11 = count2 = 0

            box0.write(1)
            box00.write(10)
            // this should trigger re-computation of `box2`
            dispatcher = box11

            t.is(box2.read(), 4)

            t.is(count1, 2)
            t.is(count11, 1)

            // the key assertion of the test
            t.is(count2, 2)
        })
    }

    doTest(t, GraphGen.new({ sync : true }))
    doTest(t, GraphGen.new({ sync : false }))
})
