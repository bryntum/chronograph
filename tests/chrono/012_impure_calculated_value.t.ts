import { ChronoGraph, MinimalChronoGraph } from "../../src/chrono/Graph.js"
import { CalculatedValueGen } from "../../src/chrono/Identifier.js"
import { ProposedOrCurrent } from "../../src/chrono/Transaction.js"
import { CalculationIterator } from "../../src/primitives/Calculation.js"

declare const StartTest : any

StartTest(t => {

    t.it('`ProposedOrCurrent` effect', async t => {
        const graph : ChronoGraph   = MinimalChronoGraph.new()

        const max       = graph.variableId('variable', 100)

        const var1      = graph.addIdentifier(CalculatedValueGen.new({
            * calculation () : CalculationIterator<number> {
                const proposedValue : number    = yield ProposedOrCurrent

                const maxValue : number         = yield max

                return proposedValue <= maxValue ? proposedValue : maxValue
            }
        }))

        graph.write(var1, 18)

        graph.propagate()

        t.is(graph.read(var1), 18, 'Correct value')

        //------------------
        graph.write(var1, 180)

        graph.propagate()

        t.is(graph.read(var1), 100, 'Correct value')


        //------------------
        graph.write(max, 1000)

        graph.propagate()

        t.is(graph.read(var1), 100, 'Correct value')


        //------------------
        graph.write(max, 50)

        graph.propagate()

        t.is(graph.read(var1), 50, 'Correct value')


        //------------------
        graph.write(max, 100)

        graph.propagate()

        t.is(graph.read(var1), 50, 'Correct value')
    })


    t.it('ProposedOrCurrent - caching', async t => {
        const graph : ChronoGraph   = MinimalChronoGraph.new()

        const var0      = graph.variableId('var0', 1)

        const max       = graph.variableId('max', 100)

        const var1      = graph.addIdentifier(CalculatedValueGen.new({
            * calculation () : CalculationIterator<number> {
                const proposedValue : number    = yield ProposedOrCurrent

                const maxValue : number         = yield max

                return proposedValue <= maxValue ? proposedValue : maxValue
            }
        }))

        const spy       = t.spyOn(var1, 'calculation')

        graph.write(var1, 18)

        graph.propagate()

        t.expect(spy).toHaveBeenCalled(1)

        t.is(graph.read(var1), 18, 'Correct value')

        //------------------
        spy.reset()

        graph.write(var0, 2)

        graph.propagate()

        t.expect(spy).toHaveBeenCalled(0)

        t.is(graph.read(var1), 18, 'Correct value')

        //------------------
        spy.reset()

        graph.write(var0, 3)

        graph.propagate()

        t.expect(spy).toHaveBeenCalled(0)

        t.is(graph.read(var1), 18, 'Correct value')

        //------------------
        spy.reset()

        graph.write(max, 50)

        graph.propagate()

        t.expect(spy).toHaveBeenCalled(1)

        t.is(graph.read(var1), 18, 'Correct value')


        //------------------
        spy.reset()

        graph.write(max, 10)

        graph.propagate()

        t.expect(spy).toHaveBeenCalled(1)

        t.is(graph.read(var1), 10, 'Correct value')
    })


    t.iit('Lazily calculated impure identifier', async t => {
        const graph : ChronoGraph   = MinimalChronoGraph.new()

        const var0      = graph.variableId('var0', 1)

        const max       = graph.variableId('max', 100)

        const var1      = graph.addIdentifier(CalculatedValueGen.new({
            lazy : true,

            * calculation () : CalculationIterator<number> {
                const proposedValue : number    = yield ProposedOrCurrent

                if (!proposedValue) debugger

                const maxValue : number         = yield max

                return proposedValue <= maxValue ? proposedValue : maxValue
            }
        }))

        const spy       = t.spyOn(var1, 'calculation')

        graph.write(var1, 18)

        graph.propagate()

        t.expect(spy).toHaveBeenCalled(0)

        t.is(graph.read(var1), 18, 'Correct value')

        t.expect(spy).toHaveBeenCalled(1)

        //------------------
        spy.reset()

        graph.write(var1, 180)

        graph.propagate()

        t.expect(spy).toHaveBeenCalled(0)

        t.is(graph.read(var1), 100, 'Correct value')

        t.expect(spy).toHaveBeenCalled(1)


        //------------------
        spy.reset()

        graph.write(max, 10)

        graph.propagate()

        t.expect(spy).toHaveBeenCalled(0)

        t.is(graph.read(var1), 10, 'Correct value')

        t.expect(spy).toHaveBeenCalled(1)


        //------------------
        spy.reset()

        graph.write(max, 100)

        graph.propagate()

        t.expect(spy).toHaveBeenCalled(0)

        t.is(graph.read(var1), 10, 'Correct value')

        t.expect(spy).toHaveBeenCalled(1)
    })

})
