import { setCompactCounter } from "../../src/chrono2/atom/Node.js"
import { Box } from "../../src/chrono2/data/Box.js"
import { CalculableBox } from "../../src/chrono2/data/CalculableBox.js"
import { GraphGen } from "../util.js"

declare const StartTest : any

setCompactCounter(1)

StartTest(t => {

    const doTest = (t : any, graphGen : GraphGen) => {
        const prefix    = graphGen.sync ? 'SYNC: ' : 'GEN: '

        t.it(prefix + '`ProposedOrPrevious` effect', async t => {
            const max       = new Box(100)

            const box1 : CalculableBox<number>     = graphGen.calculableBox({
                calculation : eval(graphGen.calc(function* () {
                    const proposedValue : number    = box1.readProposedOrPrevious()

                    const maxValue : number         = max.read()

                    return proposedValue <= maxValue ? proposedValue : maxValue
                }))
            })

            box1.write(18)

            t.is(box1.read(), 18, 'Correct value #1')

            //------------------
            box1.write(180)

            t.is(box1.read(), 100, 'Correct value #2')

            //------------------
            max.write(1000)

            t.is(box1.read(), 100, 'Correct value #3')

            //------------------
            max.write(50)

            t.is(box1.read(), 50, 'Correct value')

            //------------------
            max.write(100)

            t.is(box1.read(), 50, 'Correct value')
        })


        t.it(prefix + 'ProposedOrPrevious - invalidation, sync', async t => {
            const max       = new Box(100)

            const box1 : CalculableBox<number>     = graphGen.calculableBox({
                calculation : eval(graphGen.calc(function* () {
                    const proposedValue : number    = box1.readProposedOrPrevious()

                    const maxValue : number         = max.read()

                    return proposedValue <= maxValue ? proposedValue : maxValue
                }))
            })

            const spy       = t.spyOn(box1, 'calculation')

            box1.write(18)

            t.is(box1.read(), 18, 'Regular case #1')

            t.expect(spy).toHaveBeenCalled(1)

            //------------------
            spy.reset()

            t.is(box1.read(), 18, 'Calculation has not been invoked, because the calculated value is same as proposed')

            t.expect(spy).toHaveBeenCalled(0)

            //------------------
            spy.reset()

            box1.write(110)

            t.is(box1.read(), 100, 'Restricted by max value')

            t.expect(spy).toHaveBeenCalled(1)

            //------------------
            spy.reset()

            t.is(box1.read(), 100, 'Calculation has been invoked, because previously calculated value is different from `proposedOrPrevious`    ')

            t.expect(spy).toHaveBeenCalled(1)

            //------------------
            spy.reset()

            max.write(50)

            t.is(box1.read(), 50, 'Regular case')

            t.expect(spy).toHaveBeenCalled(1)
        })


        t.it(prefix + '`ProposedOrPrevious` for newly added calculable identifier w/o value should return `undefined`', async t => {
            let called = false

            const var1 : CalculableBox<number>     = graphGen.calculableBox({
                calculation : eval(graphGen.calc(function* () {
                    called = true

                    const proposedValue : number    = var1.readProposedOrPrevious()

                    t.isStrict(proposedValue, undefined, "No proposed value")

                    return proposedValue || 10
                }))
            })

            t.is(var1.read(), 10, 'Correct value #1')

            t.ok(called, 'Calculation called')
        })


        t.it(prefix + 'Lazily calculated impure identifier, generators', async t => {
            const var0      = new Box(1, 'var0')

            const max       = new Box(100, 'max')

            const var1 : CalculableBox<number>     = graphGen.calculableBox({
                name    : 'var1',
                lazy    : true,
                calculation : eval(graphGen.calc(function* () {
                    const proposedValue : number    = var1.readProposedOrPrevious()

                    const maxValue : number         = (yield max)

                    return proposedValue <= maxValue ? proposedValue : maxValue
                }))
            })

            const spy       = t.spyOn(var1, 'calculation')

            var1.write(18)

            t.expect(spy).toHaveBeenCalled(0)

            t.is(var1.read(), 18, 'Correct value #1')

            t.expect(spy).toHaveBeenCalled(1)

            //------------------
            spy.reset()

            var1.write(180)

            t.expect(spy).toHaveBeenCalled(0)

            t.is(var1.read(), 100, 'Correct value #2')

            t.expect(spy).toHaveBeenCalled(1)

            //------------------
            spy.reset()

            max.write(10)

            t.expect(spy).toHaveBeenCalled(0)

            t.is(var1.read(), 10, 'Correct value #3')

            t.expect(spy).toHaveBeenCalled(1)

            //------------------
            spy.reset()

            max.write(100)

            t.expect(spy).toHaveBeenCalled(0)

            //------------------
            max.write(101)

            t.expect(spy).toHaveBeenCalled(0)

            t.is(var1.read(), 10, 'Correct value')

            t.expect(spy).toHaveBeenCalled(1)
        })
    }

    doTest(t, GraphGen.new({ sync : true }))
    doTest(t, GraphGen.new({ sync : false }))
})
