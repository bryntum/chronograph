import { setCompactCounter } from "../../src/chrono2/atom/Node.js"
import { CalculationModeGen, CalculationModeSync } from "../../src/chrono2/CalculationMode.js"
import { Box } from "../../src/chrono2/data/Box.js"
import { CalculableBox } from "../../src/chrono2/data/CalculableBox.js"
import { CalculableBoxGen } from "../../src/chrono2/data/CalculableBoxGen.js"
import { EffectHandler, ProposedOrPrevious } from "../../src/chrono2/Effect.js"
import { ChronoGraph } from "../../src/chrono2/graph/Graph.js"
import { delay } from "../../src/util/Helpers.js"
import { GraphGen } from "../util.js"

declare const StartTest : any

setCompactCounter(1)

const randomDelay = () => delay(Math.random() * 100)

StartTest(t => {

    const doTest = (t : any, graphGen : GraphGen) => {
        const prefix    = graphGen.sync ? 'SYNC: ' : 'GEN: '

        t.it(prefix + 'Should converge to etalon value', async t => {
            const etalonBox       = new Box(100)

            const dummyBox : CalculableBox<number>     = graphGen.calculableBox({
                calculation : eval(graphGen.calc(function* () {
                    return box1.readProposedOrPrevious()
                }))
            })

            const box1 : CalculableBox<number>     = graphGen.calculableBox({
                calculation : eval(graphGen.calc(function* () {
                    return box1.readProposedOrPrevious()
                })),

                calculationEtalon : function () {
                    return etalonBox.read()
                }
            })

            const spy       = t.spyOn(box1, 'calculation')

            box1.write(18)

            t.is(box1.read(), 18, 'Correct value #1')

            t.expect(spy).toHaveBeenCalled(1)

            //------------------
            spy.reset()

            t.is(box1.read(), 18, 'Correct value #2')

            // no call to calculation function, because no new batch has started
            t.expect(spy).toHaveBeenCalled(0)

            //------------------
            spy.reset()

            // to advance to next batch
            dummyBox.write(1)
            dummyBox.read()

            t.is(box1.read(), 18, 'Correct value #2')

            // one call because a new batch has been started
            t.expect(spy).toHaveBeenCalled(1)

            //------------------
            spy.reset()

            box1.write(100)

            t.is(box1.read(), 100, 'Correct value #2')

            t.expect(spy).toHaveBeenCalled(1)

            //------------------
            spy.reset()

            // to advance to next batch
            dummyBox.write(1)
            dummyBox.read()

            t.is(box1.read(), 100, 'Correct value #2')

            // no call to calculation function - value matches the etalon
            t.expect(spy).toHaveBeenCalled(0)

            //------------------
            spy.reset()

            etalonBox.write(101)

            t.is(box1.read(), 100, 'Correct value #2')

            t.expect(spy).toHaveBeenCalled(1)

            //------------------
            spy.reset()

            // to advance to next batch
            dummyBox.write(1)
            dummyBox.read()

            t.is(box1.read(), 100, 'Correct value #2')

            t.expect(spy).toHaveBeenCalled(1)
        })
    }

    doTest(t, GraphGen.new({ sync : true }))
    doTest(t, GraphGen.new({ sync : false }))
})
