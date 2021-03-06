import { ProposedOrPrevious } from "../../src/chrono/Effect.js"
import { ChronoGraph } from "../../src/chrono/Graph.js"
import { CalculatedValueGen, CalculatedValueSync } from "../../src/chrono/Identifier.js"
import { CalculationIterator } from "../../src/primitives/Calculation.js"

declare const StartTest : any

StartTest(t => {

    t.it('`ProposedOrPrevious` effect', async t => {
        const graph : ChronoGraph   = ChronoGraph.new()

        const max       = graph.variableNamed('variable', 100)

        const var1      = graph.identifier(function * () : CalculationIterator<number> {
            const proposedValue : number    = yield ProposedOrPrevious

            const maxValue : number         = yield max

            return proposedValue <= maxValue ? proposedValue : maxValue
        })

        graph.write(var1, 18)

        t.is(graph.read(var1), 18, 'Correct value #1')

        //------------------
        graph.write(var1, 180)

        t.is(graph.read(var1), 100, 'Correct value #2')

        //------------------
        graph.write(max, 1000)

        t.is(graph.read(var1), 100, 'Correct value #3')

        //------------------
        graph.write(max, 50)

        t.is(graph.read(var1), 50, 'Correct value')

        //------------------
        graph.write(max, 100)

        t.is(graph.read(var1), 50, 'Correct value')
    })


    t.it('ProposedOrPrevious - caching, generators', async t => {
        const graph : ChronoGraph   = ChronoGraph.new()

        const var0      = graph.variableNamed('var0', 1)

        const max       = graph.variableNamed('max', 100)

        const var1      = graph.addIdentifier(CalculatedValueGen.new({
            * calculation () : CalculationIterator<number> {
                const proposedValue : number    = yield ProposedOrPrevious

                const maxValue : number         = yield max

                return proposedValue <= maxValue ? proposedValue : maxValue
            }
        }))

        const spy       = t.spyOn(var1, 'calculation')

        graph.write(var1, 18)

        t.is(graph.read(var1), 18, 'Regular case #1')

        t.expect(spy).toHaveBeenCalled(1)

        //------------------
        spy.reset()

        graph.write(var0, 2)

        t.is(graph.read(var1), 18, 'Calculation has not been invoked, because the calculated value is same as proposed')

        t.expect(spy).toHaveBeenCalled(0)

        //------------------
        spy.reset()

        graph.write(var1, 110)

        t.is(graph.read(var1), 100, 'Restricted by max value')

        t.expect(spy).toHaveBeenCalled(1)

        //------------------
        spy.reset()

        graph.write(var0, 3)

        t.is(graph.read(var1), 100, 'Calculation _has not_ been invoked, because its still the same transaction')

        t.expect(spy).toHaveBeenCalled(0)

        //------------------
        spy.reset()

        graph.commit()

        t.is(graph.read(var1), 100, 'Calculation _has_ not been invoked, because immediately after commit all reads are pure')

        t.expect(spy).toHaveBeenCalled(0)

        //------------------
        spy.reset()

        graph.commit()

        t.expect(spy).toHaveBeenCalled(1)

        //------------------
        spy.reset()

        graph.write(max, 50)

        t.is(graph.read(var1), 50, 'Regular case')

        t.expect(spy).toHaveBeenCalled(1)

        //------------------
        spy.reset()

        graph.write(max, 100)

        t.is(graph.read(var1), 50, 'Regular case')

        t.expect(spy).toHaveBeenCalled(1)
    })


    t.it('ProposedOrPrevious - caching, sync', async t => {
        const graph : ChronoGraph   = ChronoGraph.new()

        const var0      = graph.variableNamed('var0', 1)

        const max       = graph.variableNamed('max', 100)

        const var1      = graph.addIdentifier(CalculatedValueSync.new({
            calculation (YIELD) : number {
                const proposedValue : number    = YIELD(ProposedOrPrevious)

                const maxValue : number         = YIELD(max)

                return proposedValue <= maxValue ? proposedValue : maxValue
            }
        }))

        const spy       = t.spyOn(var1, 'calculation')

        graph.write(var1, 18)

        t.is(graph.read(var1), 18, 'Regular case #1')

        t.expect(spy).toHaveBeenCalled(1)

        //------------------
        spy.reset()

        graph.write(var0, 2)

        t.is(graph.read(var1), 18, 'Calculation has not been invoked, because the calculated value is same as proposed')

        t.expect(spy).toHaveBeenCalled(0)

        //------------------
        spy.reset()

        graph.write(var1, 110)

        t.is(graph.read(var1), 100, 'Restricted by max value')

        t.expect(spy).toHaveBeenCalled(1)

        //------------------
        spy.reset()

        graph.write(var0, 3)

        t.is(graph.read(var1), 100, 'Calculation _has not_ been invoked, because its still the same transaction')

        t.expect(spy).toHaveBeenCalled(0)

        //------------------
        spy.reset()

        graph.commit()

        t.is(graph.read(var1), 100, 'Calculation _has_ not been invoked, because immediately after commit all reads are pure')

        t.expect(spy).toHaveBeenCalled(0)

        //------------------
        spy.reset()

        graph.commit()

        t.expect(spy).toHaveBeenCalled(1)

        //------------------
        spy.reset()

        graph.write(max, 50)

        t.is(graph.read(var1), 50, 'Regular case')

        t.expect(spy).toHaveBeenCalled(1)

        //------------------
        spy.reset()

        graph.write(max, 100)

        t.is(graph.read(var1), 50, 'Regular case')

        t.expect(spy).toHaveBeenCalled(1)
    })


    t.it('`ProposedOrPrevious` for newly added calculable identifier w/o value should return `undefined`', async t => {
        const graph : ChronoGraph   = ChronoGraph.new()

        let called = false

        const var1      = graph.identifier(function * () : CalculationIterator<number> {
            called = true

            const proposedValue : number    = yield ProposedOrPrevious

            t.isStrict(proposedValue, undefined, "No proposed value")

            return proposedValue || 10
        })

        t.is(graph.read(var1), 10, 'Correct value #1')

        t.ok(called, 'Calculation called')
    })


    t.it('Lazily calculated impure identifier, generators', async t => {
        const graph : ChronoGraph   = ChronoGraph.new()

        const var0      = graph.variableNamed('var0', 1)

        const max       = graph.variableNamed('max', 100)

        const var1      = graph.addIdentifier(CalculatedValueGen.new({
            name    : 'var1',
            lazy    : true,

            * calculation () : CalculationIterator<number> {
                const proposedValue : number    = yield ProposedOrPrevious

                const maxValue : number         = yield max

                return proposedValue <= maxValue ? proposedValue : maxValue
            }
        }))

        const spy       = t.spyOn(var1, 'calculation')

        graph.write(var1, 18)

        t.expect(spy).toHaveBeenCalled(0)

        t.is(graph.read(var1), 18, 'Correct value #1')

        t.expect(spy).toHaveBeenCalled(1)

        //------------------
        spy.reset()

        graph.write(var1, 180)

        t.expect(spy).toHaveBeenCalled(0)

        t.is(graph.read(var1), 100, 'Correct value #2')

        t.expect(spy).toHaveBeenCalled(1)

        //------------------
        spy.reset()

        graph.write(max, 10)

        t.expect(spy).toHaveBeenCalled(0)

        t.is(graph.read(var1), 10, 'Correct value #3')

        t.expect(spy).toHaveBeenCalled(1)

        //------------------
        spy.reset()

        graph.write(max, 100)

        graph.commit()

        t.expect(spy).toHaveBeenCalled(0)

        //------------------
        graph.write(max, 101)

        graph.commit()

        t.expect(spy).toHaveBeenCalled(0)

        t.is(graph.read(var1), 10, 'Correct value')

        t.expect(spy).toHaveBeenCalled(1)
    })


    t.it('Lazily calculated impure identifier, sync', async t => {
        const graph : ChronoGraph   = ChronoGraph.new()

        const var0      = graph.variableNamed('var0', 1)

        const max       = graph.variableNamed('max', 100)

        const var1      = graph.addIdentifier(CalculatedValueSync.new({
            lazy : true,

            calculation (YIELD) : number {
                const proposedValue : number    = YIELD(ProposedOrPrevious)

                const maxValue : number         = YIELD(max)

                return proposedValue <= maxValue ? proposedValue : maxValue
            }
        }))

        const spy       = t.spyOn(var1, 'calculation')

        graph.write(var1, 18)

        graph.commit()

        t.expect(spy).toHaveBeenCalled(0)

        t.is(graph.read(var1), 18, 'Correct value')

        t.expect(spy).toHaveBeenCalled(1)

        //------------------
        spy.reset()

        graph.write(var1, 180)

        graph.commit()

        t.expect(spy).toHaveBeenCalled(0)

        t.is(graph.read(var1), 100, 'Correct value')

        t.expect(spy).toHaveBeenCalled(1)


        //------------------
        spy.reset()

        graph.write(max, 10)

        graph.commit()

        t.expect(spy).toHaveBeenCalled(0)

        t.is(graph.read(var1), 10, 'Correct value')

        t.expect(spy).toHaveBeenCalled(1)


        //------------------
        spy.reset()

        graph.write(max, 100)

        graph.commit()

        t.expect(spy).toHaveBeenCalled(0)

        graph.write(max, 101)

        graph.commit()

        t.expect(spy).toHaveBeenCalled(0)

        t.is(graph.read(var1), 10, 'Correct value')

        t.expect(spy).toHaveBeenCalled(1)
    })


})
