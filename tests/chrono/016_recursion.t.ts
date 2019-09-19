import { ChronoGraph, MinimalChronoGraph } from "../../src/chrono/Graph.js"
import { Write } from "../../src/chrono/Transaction.js"

declare const StartTest : any

StartTest(t => {

    t.it('Basic', async t => {
        const graph : ChronoGraph   = MinimalChronoGraph.new()

        const var0      = graph.variableId('var0', 0)
        const var1      = graph.variableId('var1', 0)

        const varMax    = graph.variableId('varMax', 10)

        const idenSum   = graph.identifierId('idenSum', function* () {
            const sum : number  = (yield var0) + (yield var1)

            const max : number  = yield varMax

            if (sum > max) {
                yield Write(var0, (yield var0) - (sum - max))
            }

            return sum
        })

        const spy1      = t.spyOn(idenSum, 'calculation')

        //-------------------
        graph.propagate()

        t.expect(spy1).toHaveBeenCalled(1)

        t.is(graph.read(idenSum), 0, 'Correct value')


        //-------------------
        spy1.reset()

        graph.write(var0, 5)
        graph.write(var1, 7)

        graph.propagate()

        t.expect(spy1).toHaveBeenCalled(2)

        t.is(graph.read(idenSum), 10, 'Correct value')
        t.is(graph.read(var0), 3, 'Correct value')
    })
})
