import { ChronoGraph, MinimalChronoGraph } from "../../src/chrono/Graph.js"
import { CalculatedValueGen, CalculatedValueSync } from "../../src/chrono/Identifier.js"

declare const StartTest : any

StartTest(t => {

    t.iit('Lazy identifier, generators', async t => {
        const graph : ChronoGraph   = MinimalChronoGraph.new()

        const var1                  = graph.variableId('var1', 0)
        const var2                  = graph.variableId('var2', 1)

        const ident1                = graph.addIdentifier(CalculatedValueGen.new({
            name            : 'ident1',
            lazy            : true,
            calculation     : function * () {
                return (yield var1) + (yield var2)
            }
        }))

        const ident2                = graph.addIdentifier(CalculatedValueGen.new({
            name            : 'ident2',
            lazy            : true,
            calculation     : function * () {
                return (yield ident1) + 1
            }
        }))

        const spy1                  = t.spyOn(ident1, 'calculation')
        const spy2                  = t.spyOn(ident2, 'calculation')

        graph.propagate()

        t.expect(spy1).toHaveBeenCalled(0)
        t.expect(spy2).toHaveBeenCalled(0)

        // ----------------
        t.is(graph.read(ident1), 1, "Correct result calculated #1")

        t.expect(spy1).toHaveBeenCalled(1)
        t.expect(spy2).toHaveBeenCalled(0)

        // ----------------
        spy1.reset()
        spy2.reset()

        t.is(graph.read(ident2), 2, "Correct result calculated #2")

        t.expect(spy1).toHaveBeenCalled(0)
        t.expect(spy2).toHaveBeenCalled(1)

        // ----------------
        spy1.reset()
        spy2.reset()

        t.is(graph.read(ident2), 2, "Correct result calculated #3")

        t.expect(spy1).toHaveBeenCalled(0)
        t.expect(spy2).toHaveBeenCalled(0)

        // ----------------
        spy1.reset()
        spy2.reset()

        graph.write(var1, 1)

        graph.propagate()

        t.expect(spy1).toHaveBeenCalled(0)
        t.expect(spy2).toHaveBeenCalled(0)

        t.is(graph.read(ident2), 3, "Correct result calculated #4")

        t.expect(spy1).toHaveBeenCalled(1)
        t.expect(spy2).toHaveBeenCalled(1)
    })

    t.it('Lazy identifier, sync', async t => {
        const graph : ChronoGraph   = MinimalChronoGraph.new()

        const var1                  = graph.variableId('var1', 0)
        const var2                  = graph.variableId('var2', 1)

        const ident1                = graph.addIdentifier(CalculatedValueSync.new({
            name            : 'ident1',
            lazy            : true,
            calculation     : function (YIELD) {
                return YIELD(var1) + YIELD(var2)
            }
        }))

        const ident2                = graph.addIdentifier(CalculatedValueSync.new({
            name            : 'ident2',
            lazy            : true,
            calculation     : function (YIELD) {
                return YIELD(ident1) + 1
            }
        }))

        const spy1                  = t.spyOn(ident1, 'calculation')
        const spy2                  = t.spyOn(ident2, 'calculation')

        graph.propagate()

        t.expect(spy1).toHaveBeenCalled(0)
        t.expect(spy2).toHaveBeenCalled(0)

        // ----------------
        t.is(graph.read(ident1), 1, "Correct result calculated #1")

        t.expect(spy1).toHaveBeenCalled(1)
        t.expect(spy2).toHaveBeenCalled(0)

        // ----------------
        spy1.reset()
        spy2.reset()

        t.is(graph.read(ident2), 2, "Correct result calculated #2")

        t.expect(spy1).toHaveBeenCalled(0)
        t.expect(spy2).toHaveBeenCalled(1)

        // ----------------
        spy1.reset()
        spy2.reset()

        t.is(graph.read(ident2), 2, "Correct result calculated #3")

        t.expect(spy1).toHaveBeenCalled(0)
        t.expect(spy2).toHaveBeenCalled(0)

        // ----------------
        spy1.reset()
        spy2.reset()

        graph.write(var1, 1)

        graph.propagate()

        t.expect(spy1).toHaveBeenCalled(0)
        t.expect(spy2).toHaveBeenCalled(0)

        t.is(graph.read(ident2), 3, "Correct result calculated #4")

        t.expect(spy1).toHaveBeenCalled(1)
        t.expect(spy2).toHaveBeenCalled(1)
    })

})
