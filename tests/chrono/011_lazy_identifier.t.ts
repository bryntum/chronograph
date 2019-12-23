import { ProposedOrCurrent } from "../../src/chrono/Effect.js"
import { ChronoGraph, MinimalChronoGraph } from "../../src/chrono/Graph.js"
import { CalculatedValueGen, CalculatedValueSync } from "../../src/chrono/Identifier.js"
import { Revision } from "../../src/chrono/Revision.js"
import { CalculationIterator } from "../../src/primitives/Calculation.js"

declare const StartTest : any

StartTest(t => {

    t.it('Lazy identifier, generators', async t => {
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


    t.it('Should not use stale deep history', async t => {
        const graph1 : ChronoGraph       = MinimalChronoGraph.new()

        const i1            = graph1.variableId('i1', 0)
        const i2            = graph1.variableId('i2', 1)
        const dispatcher    = graph1.variableId('dispatcher', i1)

        const c1            = graph1.addIdentifier(CalculatedValueGen.new({
            name            : 'c1',
            lazy            : true,
            calculation     : function * () {
                return (yield (yield dispatcher)) + 1
            }
        }))

        graph1.propagate()

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph1.read(node)), [ 0, 1, i1, 1 ], "Correct result calculated")

        // ----------------
        const c1Spy         = t.spyOn(c1, 'calculation')

        graph1.write(dispatcher, i2)

        graph1.propagate()

        t.expect(c1Spy).toHaveBeenCalled(0)

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph1.read(node)), [ 0, 1, i2, 2 ], "Original branch not affected")

        t.expect(c1Spy).toHaveBeenCalled(1)

        // ----------------
        c1Spy.reset()

        graph1.write(i1, 10)

        graph1.propagate()

        t.expect(c1Spy).toHaveBeenCalled(0)

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph1.read(node)), [ 10, 1, i2, 2 ], "Correct result calculated")

        t.expect(c1Spy).toHaveBeenCalled(0)
    })


    t.it('Should be able to calculate lazy identifier that uses `ProposedOrCurrent`', async t => {
        const graph1 : ChronoGraph       = MinimalChronoGraph.new()

        const i1            = graph1.variableId('i1', 0)
        const i2            = graph1.variableId('i2', 1)

        const dispatcher    = graph1.variableId('dispatcher', 'pure')

        const c1            = graph1.addIdentifier(CalculatedValueGen.new({
            name            : 'c1',
            lazy            : true,
            calculation     : function * () : CalculationIterator<number> {
                const dispatch : string = yield dispatcher

                if (dispatch === 'pure') {
                    return (yield i1) + (yield i2)
                } else {
                    return (yield ProposedOrCurrent)
                }
            }
        }))

        graph1.propagate()

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph1.read(node)), [ 0, 1, 'pure', 1 ], "Correct result calculated")

        // ----------------
        const c1Spy         = t.spyOn(c1, 'calculation')

        graph1.write(dispatcher, 'proposed')
        graph1.write(c1, 10)

        graph1.propagate()

        t.expect(c1Spy).toHaveBeenCalled(0)

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph1.read(node)), [ 0, 1, 'proposed', 10 ], "Correctly calculated lazy value")

        t.expect(c1Spy).toHaveBeenCalled(1)

        // ----------------
        c1Spy.reset()

        graph1.write(i1, 10)

        graph1.propagate()

        t.expect(c1Spy).toHaveBeenCalled(0)

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph1.read(node)), [ 10, 1, 'proposed', 10 ], "Correct result calculated")

        t.expect(c1Spy).toHaveBeenCalled(0)
    })


    t.it('Should be able to calculate lazy identifier that uses `ProposedOrCurrent` - sync', async t => {
        const graph1 : ChronoGraph       = MinimalChronoGraph.new()

        const i1            = graph1.variableId('i1', 0)
        const i2            = graph1.variableId('i2', 1)

        const dispatcher    = graph1.variableId('dispatcher', 'pure')

        const c1            = graph1.addIdentifier(CalculatedValueSync.new({
            name            : 'c1',
            lazy            : true,
            calculation     : function (YIELD) : number {
                const dispatch : string = YIELD(dispatcher)

                if (dispatch === 'pure') {
                    return YIELD(i1) + YIELD(i2)
                } else {
                    return YIELD(ProposedOrCurrent)
                }
            }
        }))

        graph1.propagate()

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph1.read(node)), [ 0, 1, 'pure', 1 ], "Correct result calculated")

        // ----------------
        const c1Spy         = t.spyOn(c1, 'calculation')

        graph1.write(dispatcher, 'proposed')
        graph1.write(c1, 10)

        graph1.propagate()

        t.expect(c1Spy).toHaveBeenCalled(0)

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph1.read(node)), [ 0, 1, 'proposed', 10 ], "Correctly calculated lazy value")

        t.expect(c1Spy).toHaveBeenCalled(1)

        // ----------------
        c1Spy.reset()

        graph1.write(i1, 10)

        graph1.propagate()

        t.expect(c1Spy).toHaveBeenCalled(0)

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph1.read(node)), [ 10, 1, 'proposed', 10 ], "Correct result calculated")

        t.expect(c1Spy).toHaveBeenCalled(0)
    })


    t.it('Should calculate lazy identifiers in a batch', async t => {
        const graph1 : ChronoGraph       = MinimalChronoGraph.new()

        const i1            = graph1.variableId('i1', 0)
        const i2            = graph1.variableId('i2', 1)

        const c1            = graph1.addIdentifier(CalculatedValueGen.new({
            name            : 'c1',
            lazy            : true,
            calculation     : function * () : CalculationIterator<number> {
                return (yield i1) + (yield i2)
            }
        }))

        const c2            = graph1.addIdentifier(CalculatedValueGen.new({
            name            : 'c2',
            lazy            : true,
            calculation     : function * () : CalculationIterator<number> {
                return (yield c1) + 1
            }
        }))

        const c3            = graph1.addIdentifier(CalculatedValueGen.new({
            name            : 'c3',
            lazy            : true,
            calculation     : function * () : CalculationIterator<number> {
                return (yield c2) + 1
            }
        }))

        graph1.propagate()

        t.isDeeply([ i1, i2, c1, c2, c3 ].map(node => graph1.read(node)), [ 0, 1, 1, 2, 3 ], "Correct result calculated")

        // ----------------
        const c1Spy         = t.spyOn(Revision.prototype, 'calculateLazyEntry')

        graph1.write(i1, 1)

        graph1.propagate()

        // reading `c3` should calculate `c2` and `c1` inside the `calculateTransitionsStack`, not as separate
        // calls to `calculateLazyEntry`
        t.isDeeply([ c3 ].map(node => graph1.read(node)), [ 4 ], "Correct result calculated")

        t.expect(c1Spy).toHaveBeenCalled(1)
    })
})
