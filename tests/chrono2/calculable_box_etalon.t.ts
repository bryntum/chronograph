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

        // TODO

        // t.it(prefix + '`ProposedOrPrevious` effect', async t => {
        //     const max       = new Box(100)
        //
        //     const box1 : CalculableBox<number>     = graphGen.calculableBox({
        //         calculation : eval(graphGen.calc(function* () {
        //             const proposedValue : number    = box1.readProposedOrPrevious()
        //
        //             const maxValue : number         = max.read()
        //
        //             return proposedValue <= maxValue ? proposedValue : maxValue
        //         }))
        //     })
        //
        //     box1.write(18)
        //
        //     t.is(box1.read(), 18, 'Correct value #1')
        //
        //     //------------------
        //     box1.write(180)
        //
        //     t.is(box1.read(), 100, 'Correct value #2')
        //
        //     //------------------
        //     max.write(1000)
        //
        //     t.is(box1.read(), 100, 'Correct value #3')
        //
        //     //------------------
        //     max.write(50)
        //
        //     t.is(box1.read(), 50, 'Correct value')
        //
        //     //------------------
        //     max.write(100)
        //
        //     t.is(box1.read(), 50, 'Correct value')
        // })


    }

    doTest(t, GraphGen.new({ sync : true }))
    doTest(t, GraphGen.new({ sync : false }))
})
