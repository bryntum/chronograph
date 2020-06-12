import { Box } from "../../src/chrono2/data/Box.js"
import { CalculableBox } from "../../src/chrono2/data/CalculableBox.js"

declare const StartTest : any

StartTest(t => {

    t.it('`ProposedOrPrevious` effect', async t => {
        const max       = new Box()
        max.write(100)

        const box1      = new CalculableBox({
            calculation : () => {
                const proposedValue : number    = box1.readProposedOrPrevious()

                const maxValue : number         = max.read()

                return proposedValue <= maxValue ? proposedValue : maxValue
            }
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


    t.it('ProposedOrPrevious - invalidation, sync', async t => {
        const max       = new Box(100)

        const box1      = new CalculableBox({
            calculation : () => {
                const proposedValue : number    = box1.readProposedOrPrevious()

                const maxValue : number         = max.read()

                return proposedValue <= maxValue ? proposedValue : maxValue
            }
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


    // t.it('`ProposedOrPrevious` for newly added calculable identifier w/o value should return `undefined`', async t => {
    //     const graph : ChronoGraph   = ChronoGraph.new()
    //
    //     let called = false
    //
    //     const var1      = graph.identifier(function * () : CalculationIterator<number> {
    //         called = true
    //
    //         const proposedValue : number    = yield ProposedOrPrevious
    //
    //         t.isStrict(proposedValue, undefined, "No proposed value")
    //
    //         return proposedValue || 10
    //     })
    //
    //     t.is(graph.read(var1), 10, 'Correct value #1')
    //
    //     t.ok(called, 'Calculation called')
    // })
    //
    //
    // t.it('Lazily calculated impure identifier, generators', async t => {
    //     const graph : ChronoGraph   = ChronoGraph.new()
    //
    //     const var0      = graph.variableNamed('var0', 1)
    //
    //     const max       = graph.variableNamed('max', 100)
    //
    //     const var1      = graph.addIdentifier(CalculatedValueGen.new({
    //         name    : 'var1',
    //         lazy    : true,
    //
    //         * calculation () : CalculationIterator<number> {
    //             const proposedValue : number    = yield ProposedOrPrevious
    //
    //             const maxValue : number         = yield max
    //
    //             return proposedValue <= maxValue ? proposedValue : maxValue
    //         }
    //     }))
    //
    //     const spy       = t.spyOn(var1, 'calculation')
    //
    //     graph.write(var1, 18)
    //
    //     t.expect(spy).toHaveBeenCalled(0)
    //
    //     t.is(graph.read(var1), 18, 'Correct value #1')
    //
    //     t.expect(spy).toHaveBeenCalled(1)
    //
    //     //------------------
    //     spy.reset()
    //
    //     graph.write(var1, 180)
    //
    //     t.expect(spy).toHaveBeenCalled(0)
    //
    //     t.is(graph.read(var1), 100, 'Correct value #2')
    //
    //     t.expect(spy).toHaveBeenCalled(1)
    //
    //     //------------------
    //     spy.reset()
    //
    //     graph.write(max, 10)
    //
    //     t.expect(spy).toHaveBeenCalled(0)
    //
    //     t.is(graph.read(var1), 10, 'Correct value #3')
    //
    //     t.expect(spy).toHaveBeenCalled(1)
    //
    //     //------------------
    //     spy.reset()
    //
    //     graph.write(max, 100)
    //
    //     graph.commit()
    //
    //     t.expect(spy).toHaveBeenCalled(0)
    //
    //     //------------------
    //     graph.write(max, 101)
    //
    //     graph.commit()
    //
    //     t.expect(spy).toHaveBeenCalled(0)
    //
    //     t.is(graph.read(var1), 10, 'Correct value')
    //
    //     t.expect(spy).toHaveBeenCalled(1)
    // })
    //
    //
    // t.it('Lazily calculated impure identifier, sync', async t => {
    //     const graph : ChronoGraph   = ChronoGraph.new()
    //
    //     const var0      = graph.variableNamed('var0', 1)
    //
    //     const max       = graph.variableNamed('max', 100)
    //
    //     const var1      = graph.addIdentifier(CalculatedValueSync.new({
    //         lazy : true,
    //
    //         calculation (YIELD) : number {
    //             const proposedValue : number    = YIELD(ProposedOrPrevious)
    //
    //             const maxValue : number         = YIELD(max)
    //
    //             return proposedValue <= maxValue ? proposedValue : maxValue
    //         }
    //     }))
    //
    //     const spy       = t.spyOn(var1, 'calculation')
    //
    //     graph.write(var1, 18)
    //
    //     graph.commit()
    //
    //     t.expect(spy).toHaveBeenCalled(0)
    //
    //     t.is(graph.read(var1), 18, 'Correct value')
    //
    //     t.expect(spy).toHaveBeenCalled(1)
    //
    //     //------------------
    //     spy.reset()
    //
    //     graph.write(var1, 180)
    //
    //     graph.commit()
    //
    //     t.expect(spy).toHaveBeenCalled(0)
    //
    //     t.is(graph.read(var1), 100, 'Correct value')
    //
    //     t.expect(spy).toHaveBeenCalled(1)
    //
    //
    //     //------------------
    //     spy.reset()
    //
    //     graph.write(max, 10)
    //
    //     graph.commit()
    //
    //     t.expect(spy).toHaveBeenCalled(0)
    //
    //     t.is(graph.read(var1), 10, 'Correct value')
    //
    //     t.expect(spy).toHaveBeenCalled(1)
    //
    //
    //     //------------------
    //     spy.reset()
    //
    //     graph.write(max, 100)
    //
    //     graph.commit()
    //
    //     t.expect(spy).toHaveBeenCalled(0)
    //
    //     graph.write(max, 101)
    //
    //     graph.commit()
    //
    //     t.expect(spy).toHaveBeenCalled(0)
    //
    //     t.is(graph.read(var1), 10, 'Correct value')
    //
    //     t.expect(spy).toHaveBeenCalled(1)
    // })


})
