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


        t.it(prefix + 'ProposedOrPrevious - invalidation', async t => {
            const max       = new Box(100)

            const box1 : CalculableBox<number>     = graphGen.calculableBox({
                calculation : eval(graphGen.calc(function* () {
                    const proposedValue : number    = box1.readProposedOrPrevious()

                    const maxValue : number         = (yield max)

                    return proposedValue <= maxValue ? proposedValue : maxValue
                }))
            })

            const box2 : CalculableBox<number>     = graphGen.calculableBox({
                calculation : eval(graphGen.calc(function* () {
                    return box2.readProposedOrPrevious()
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

            t.is(box1.read(), 100, 'Calculation has not been invoked, because no new batch has started')

            t.expect(spy).toHaveBeenCalled(0)

            //------------------
            spy.reset()

            box2.write(50)
            box2.read()

            t.is(box1.read(), 100, 'Calculation has been invoked, because new batch has started')

            t.expect(spy).toHaveBeenCalled(1)

            //------------------
            spy.reset()

            max.write(50)

            t.is(box1.read(), 50, 'Regular case')

            t.expect(spy).toHaveBeenCalled(1)
        })


        t.it(prefix + 'Should mark atoms that did not match the "etalon" as stale on next commit', async t => {
            const graph     = ChronoGraph.new()

            const max       = new Box(100)

            const box1 : CalculableBox<number>     = graphGen.calculableBox({
                lazy : false,
                calculation : eval(graphGen.calc(function* () {
                    const proposedValue : number    = box1.readProposedOrPrevious()

                    const maxValue : number         = (yield max)

                    return proposedValue <= maxValue ? proposedValue : maxValue
                }))
            })

            graph.addAtoms([ max, box1 ])

            const spy       = t.spyOn(box1, 'calculation')

            box1.write(18)

            graph.commit()

            t.expect(spy).toHaveBeenCalled(1)

            t.is(box1.read(), 18, 'Regular case #1')


            //------------------
            spy.reset()

            graph.commit()

            t.expect(spy).toHaveBeenCalled(0)

            t.is(box1.read(), 18, 'Calculation has not been invoked, because the calculated value is same as proposed')


            //------------------
            spy.reset()

            box1.write(110)

            graph.commit()

            t.expect(spy).toHaveBeenCalled(1)

            t.is(box1.read(), 100, 'Restricted by max value')


            //------------------
            spy.reset()

            t.is(box1.read(), 100, 'Calculation has not been invoked, because no new batch has started')

            t.expect(spy).toHaveBeenCalled(0)

            //------------------
            spy.reset()

            graph.commit()

            t.expect(spy).toHaveBeenCalled(1)

            t.is(box1.read(), 100, 'Calculation has been invoked, because new batch has started')

            //------------------
            spy.reset()

            max.write(50)

            graph.commit()

            t.expect(spy).toHaveBeenCalled(1)

            t.is(box1.read(), 50, 'Regular case')
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


        t.it(prefix + 'Lazily calculated impure identifier', async t => {
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


        t.it(prefix + 'ProposedOrPrevious - stale after etalon mismatch', async t => {
            const max       = new Box(100)

            let counter1    = 0
            const box1 : CalculableBox<number>     = graphGen.calculableBox({
                name        : 'box1',
                calculation : eval(graphGen.calc(function* () {
                    counter1++

                    const proposedValue : number    = box1.readProposedOrPrevious()

                    const maxValue : number         = max.read()

                    return proposedValue <= maxValue ? proposedValue : maxValue
                }))
            })

            let counter2    = 0
            const box2 : CalculableBox<number>     = graphGen.calculableBox({
                name        : 'box2',
                calculation : eval(graphGen.calc(function* () {
                    counter2++

                    return (yield box1) + 1
                }))
            })

            let counter3    = 0
            const box3 : CalculableBox<number>     = graphGen.calculableBox({
                name        : 'box3',
                calculation : eval(graphGen.calc(function* () {
                    counter3++

                    return (yield box1) + (yield box2) + 1
                }))
            })

            box1.write(18)

            t.is(box3.read(), 18 + 19 + 1, 'Regular case #1')
            t.is(box2.read(), 19, 'Regular case #1')

            t.isDeeply([ counter1, counter2, counter3 ], [ 1, 1, 1 ])

            //-------------------------
            counter1 = counter2 = counter3 = 0

            box1.write(180)

            // `box3` will read `box1` and `box2`, `box2` will read `box1` too
            // so in total during `box3` calculation, `box1` is read twice,
            // the 1st read will trigger calculation with "etalon mismatch"
            // the 2nd should not trigger recalculation, since its the same batch
            t.is(box3.read(), 100 + 101 + 1)

            t.isDeeply(
                [ counter1, counter2, counter3 ],
                [ 1, 1, 1 ],
                'Even if `box1` mismatches the etalon value, it should be still calculated only once during the current batch'
            )

            //-------------------------
            counter1 = counter2 = counter3 = 0

            // now re-reading the `box2` should not trigger recalculation, since its in `UpToDate` state and
            // we consider reading to be "pure" operation that does not change the graph
            t.is(box2.read(), 101, 'Value did not change')

            t.isDeeply([ counter1, counter2 ], [ 0, 0 ])
        })


        t.it(prefix + 'ProposedOrPrevious - stale after etalon mismatch, using graph commit', async t => {
            const graph     = ChronoGraph.new()

            const max       = new Box(100)

            let counter1    = 0
            const box1 : CalculableBox<number>     = graphGen.calculableBox({
                name        : 'box1',
                lazy        : false,
                calculation : eval(graphGen.calc(function* () {
                    counter1++

                    const proposedValue : number    = box1.readProposedOrPrevious()

                    const maxValue : number         = max.read()

                    return proposedValue <= maxValue ? proposedValue : maxValue
                }))
            })

            let counter2    = 0
            const box2 : CalculableBox<number>     = graphGen.calculableBox({
                name        : 'box2',
                lazy        : false,
                calculation : eval(graphGen.calc(function* () {
                    counter2++

                    return (yield box1) + 1
                }))
            })

            let counter3    = 0
            const box3 : CalculableBox<number>     = graphGen.calculableBox({
                name        : 'box3',
                lazy        : false,
                calculation : eval(graphGen.calc(function* () {
                    counter3++

                    return (yield box1) + (yield box2) + 1
                }))
            })

            graph.addAtoms([ max, box1, box2, box3 ])

            box1.write(18)

            graph.commit()

            t.isDeeply([ counter1, counter2, counter3 ], [ 1, 1, 1 ])

            t.is(box3.read(), 18 + 19 + 1, 'Regular case #1')
            t.is(box2.read(), 19, 'Regular case #1')

            //-------------------------
            counter1 = counter2 = counter3 = 0

            box1.write(180)

            graph.commit()

            t.isDeeply(
                [ counter1, counter2, counter3 ],
                [ 1, 1, 1 ],
                'Even if `box1` mismatches the etalon value, it should be still calculated only once during the current batch'
            )

            t.is(box3.read(), 100 + 101 + 1)

            //-------------------------
            counter1 = counter2 = counter3 = 0

            graph.commit()

            t.isDeeply([ counter1, counter2 ], [ 1, 0 ])

            t.is(box2.read(), 101, 'Value did not change')
        })
    }

    doTest(t, GraphGen.new({ sync : true }))
    doTest(t, GraphGen.new({ sync : false }))


    // TODO deprecate and remove effect handler as 1st argument
    t.it('SYNC: Should support yielding `ProposedOrPrevious` symbol instead of `readProposedOrPrevious` call', async t => {
        const var1 : CalculableBox<number>     = new CalculableBox({
            name    : 'var1',
            lazy    : false,
            calculation : function (Y : EffectHandler<CalculationModeSync>) {
                const proposedValue : number    = Y(ProposedOrPrevious)

                return proposedValue
            }
        })

        const spy       = t.spyOn(var1, 'calculation')

        var1.write(1)

        t.is(var1.read(), 1, 'Correct value #1')

        t.expect(spy).toHaveBeenCalled(1)

        //------------------
        spy.reset()

        var1.write(10)

        t.is(var1.read(), 10, 'Correct value #2')

        t.expect(spy).toHaveBeenCalled(1)
    })


    // TODO deprecate and remove effect handler as 1st argument
    t.it('GEN: Should support yielding `ProposedOrPrevious` symbol instead of `readProposedOrPrevious` call', t => {
        const var1 : CalculableBox<number>     = new CalculableBoxGen({
            name    : 'var1',
            lazy    : false,
            calculation : function* (Y : EffectHandler<CalculationModeGen>) {
                const proposedValue : number    = yield ProposedOrPrevious

                return proposedValue
            }
        })

        const spy       = t.spyOn(var1, 'calculation')

        var1.write(1)

        t.is(var1.read(), 1, 'Correct value #1')

        t.expect(spy).toHaveBeenCalled(1)

        //------------------
        spy.reset()

        var1.write(10)

        t.is(var1.read(), 10, 'Correct value #2')

        t.expect(spy).toHaveBeenCalled(1)
    })


    // TODO deprecate and remove effect handler as 1st argument
    t.it('GEN+ASYNC: Should support yielding `ProposedOrPrevious` symbol instead of `readProposedOrPrevious` call', async t => {
        const var1 : CalculableBox<number>     = new CalculableBoxGen({
            name    : 'var1',
            lazy    : false,
            calculation : function* (Y : EffectHandler<CalculationModeGen>) {
                yield randomDelay()

                const proposedValue : number    = yield ProposedOrPrevious

                return proposedValue
            }
        })

        const spy       = t.spyOn(var1, 'calculation')

        var1.write(1)

        t.is(await var1.readAsync(), 1, 'Correct value #1')

        t.expect(spy).toHaveBeenCalled(1)

        //------------------
        spy.reset()

        var1.write(10)

        t.is(await var1.readAsync(), 10, 'Correct value #2')

        t.expect(spy).toHaveBeenCalled(1)
    })

})
