import { computed, observable } from "../../node_modules/mobx/lib/mobx.module.js"
import { Box } from "../../src/chrono2/data/Box.js"
import { CalculableBox } from "../../src/chrono2/data/CalculableBox.js"
import { ChronoGraph } from "../../src/chrono2/Graph.js"
import { setCompactCounter } from "../../src/chrono2/Node.js"

declare const StartTest : any

setCompactCounter(1)

StartTest(t => {

    t.it('Lazy identifier, sync', async t => {
        const var1                  = new Box(0)

        const var2                  = new Box(1)

        const ident1                = new CalculableBox({
            lazy            : true,
            calculation     : function () {
                return var1.read() + var2.read()
            }
        })

        const ident2                = new CalculableBox({
            lazy            : true,
            calculation     : function () {
                return ident1.read() + 1
            }
        })

        const spy1                  = t.spyOn(ident1, 'calculation')
        const spy2                  = t.spyOn(ident2, 'calculation')

        t.expect(spy1).toHaveBeenCalled(0)
        t.expect(spy2).toHaveBeenCalled(0)

        // ----------------
        t.is(ident1.read(), 1, "Correct result calculated #1")

        t.expect(spy1).toHaveBeenCalled(1)
        t.expect(spy2).toHaveBeenCalled(0)

        // ----------------
        spy1.reset()
        spy2.reset()

        t.is(ident2.read(), 2, "Correct result calculated #2")

        t.expect(spy1).toHaveBeenCalled(0)
        t.expect(spy2).toHaveBeenCalled(1)

        // ----------------
        spy1.reset()
        spy2.reset()

        t.is(ident2.read(), 2, "Correct result calculated #3")

        t.expect(spy1).toHaveBeenCalled(0)
        t.expect(spy2).toHaveBeenCalled(0)

        // ----------------
        spy1.reset()
        spy2.reset()

        var1.write(1)

        t.expect(spy1).toHaveBeenCalled(0)
        t.expect(spy2).toHaveBeenCalled(0)

        t.is(ident2.read(), 3, "Correct result calculated #4")

        t.expect(spy1).toHaveBeenCalled(1)
        t.expect(spy2).toHaveBeenCalled(1)
    })


    t.it('Should not use stale deep history', t => {
        const i1            = new Box(0)
        const i2            = new Box(1)
        const dispatcher    = new Box(i1)

        const c1            = new CalculableBox({
            lazy            : true,
            calculation     : function () {
                return dispatcher.read().read() + 1
            }
        })

        // during these reads the `c1` will acquire a dependency on `i1`
        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => node.read()), [ 0, 1, i1, 1 ], "Correct result calculated #1")

        // ----------------
        const c1Spy         = t.spyOn(c1, 'calculation')

        dispatcher.write(i2)

        t.expect(c1Spy).toHaveBeenCalled(0)

        // during these reads the `c1` will acquire a dependency on `i2` and old dependency on `i1` will become "stale"
        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => node.read()), [ 0, 1, i2, 2 ], "Correct result calculated #2")

        t.expect(c1Spy).toHaveBeenCalled(1)

        // ----------------
        c1Spy.reset()

        // this write should not affect `c1` since it depends on `i2`
        i1.write(10)

        t.expect(c1Spy).toHaveBeenCalled(0)

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => node.read()), [ 10, 1, i2, 2 ], "Correct result calculated #3")

        t.expect(c1Spy).toHaveBeenCalled(0)
    })


    t.it('Should not use stale deep history, with commits', t => {
        const graph1 : ChronoGraph       = ChronoGraph.new()

        const i1            = new Box(0)
        const i2            = new Box(1)
        const dispatcher    = new Box(i1)

        const c1            = new CalculableBox({
            lazy            : true,
            calculation     : function () {
                return dispatcher.read().read() + 1
            }
        })

        graph1.addAtoms([ i1, i2, dispatcher, c1 ])

        graph1.commit()

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => node.read()), [ 0, 1, i1, 1 ], "Correct result calculated #1")

        // ----------------
        const c1Spy         = t.spyOn(c1, 'calculation')

        dispatcher.write(i2)

        graph1.commit()

        t.expect(c1Spy).toHaveBeenCalled(0)

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => node.read()), [ 0, 1, i2, 2 ], "Correct result calculated #2")

        t.expect(c1Spy).toHaveBeenCalled(1)

        // ----------------
        c1Spy.reset()

        i1.write(10)

        graph1.commit()

        t.expect(c1Spy).toHaveBeenCalled(0)

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => node.read()), [ 10, 1, i2, 2 ], "Correct result calculated #3")

        t.expect(c1Spy).toHaveBeenCalled(0)
    })


    t.it('Should be able to calculate lazy identifier that uses `ProposedOrPrevious` - sync', async t => {
        const graph1 : ChronoGraph       = ChronoGraph.new()

        const i1            = new Box(0)
        const i2            = new Box(1)

        const dispatcher    = new Box('pure')

        const c1            = new CalculableBox({
            calculation     : function () : number {
                const dispatch : string = dispatcher.read()

                if (dispatch === 'pure') {
                    return i1.read() + i2.read()
                } else {
                    return c1.readProposedOrPrevious()
                }
            }
        })

        graph1.commit()

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => node.read()), [ 0, 1, 'pure', 1 ], "Correct result calculated")

        // ----------------
        const c1Spy         = t.spyOn(c1, 'calculation')

        dispatcher.write('proposed')
        c1.write(10)

        t.expect(c1Spy).toHaveBeenCalled(0)

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => node.read()), [ 0, 1, 'proposed', 10 ], "Correctly calculated lazy value")

        t.expect(c1Spy).toHaveBeenCalled(1)

        // ----------------
        c1Spy.reset()

        i1.write(10)

        t.expect(c1Spy).toHaveBeenCalled(0)

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => node.read()), [ 10, 1, 'proposed', 10 ], "Correct result calculated")

        t.expect(c1Spy).toHaveBeenCalled(0)
    })


    t.it('Should be able to calculate lazy identifier that uses `ProposedOrPrevious` - sync, with commits', async t => {
        const graph1 : ChronoGraph       = ChronoGraph.new()

        const i1            = new Box(0)
        const i2            = new Box(1)

        const dispatcher    = new Box('pure')

        const c1            = new CalculableBox({
            lazy            : true,
            calculation     : function () : number {
                const dispatch : string = dispatcher.read()

                if (dispatch === 'pure') {
                    return i1.read() + i2.read()
                } else {
                    return c1.readProposedOrPrevious()
                }
            }
        })

        graph1.commit()

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => node.read()), [ 0, 1, 'pure', 1 ], "Correct result calculated")

        // ----------------
        const c1Spy         = t.spyOn(c1, 'calculation')

        dispatcher.write('proposed')
        c1.write(10)

        graph1.commit()

        t.expect(c1Spy).toHaveBeenCalled(0)

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => node.read()), [ 0, 1, 'proposed', 10 ], "Correctly calculated lazy value")

        t.expect(c1Spy).toHaveBeenCalled(1)

        // ----------------
        c1Spy.reset()

        i1.write(10)

        graph1.commit()

        t.expect(c1Spy).toHaveBeenCalled(0)

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => node.read()), [ 10, 1, 'proposed', 10 ], "Correct result calculated")

        t.expect(c1Spy).toHaveBeenCalled(0)
    })


    // t.it('Should calculate lazy identifiers in a batch', async t => {
    //     const graph1 : ChronoGraph       = ChronoGraph.new()
    //
    //     const i1            = graph1.variableNamed('i1', 0)
    //     const i2            = graph1.variableNamed('i2', 1)
    //
    //     const c1            = graph1.addIdentifier(CalculatedValueGen.new({
    //         name            : 'c1',
    //         lazy            : true,
    //         calculation     : function * () : CalculationIterator<number> {
    //             return (yield i1) + (yield i2)
    //         }
    //     }))
    //
    //     const c2            = graph1.addIdentifier(CalculatedValueGen.new({
    //         name            : 'c2',
    //         lazy            : true,
    //         calculation     : function * () : CalculationIterator<number> {
    //             return (yield c1) + 1
    //         }
    //     }))
    //
    //     const c3            = graph1.addIdentifier(CalculatedValueGen.new({
    //         name            : 'c3',
    //         lazy            : true,
    //         calculation     : function * () : CalculationIterator<number> {
    //             return (yield c2) + 1
    //         }
    //     }))
    //
    //     graph1.commit()
    //
    //     t.isDeeply([ i1, i2, c1, c2, c3 ].map(node => graph1.read(node)), [ 0, 1, 1, 2, 3 ], "Correct result calculated")
    //
    //     // ----------------
    //     const c1Spy         = t.spyOn(Transaction.prototype, 'calculateTransitionsStackSync')
    //
    //     graph1.write(i1, 1)
    //
    //     graph1.commit()
    //
    //     // reading `c3` should calculate `c2` and `c1` inside the `calculateTransitionsStack` once, not as
    //     // separate calls for every lazy identifier
    //     t.isDeeply([ c3 ].map(node => graph1.read(node)), [ 4 ], "Correct result calculated")
    //
    //     t.expect(c1Spy).toHaveBeenCalled(1)
    // })
    //
    //
    // t.it('Should calculate lazy identifiers in the current transaction', async t => {
    //     const graph1 : ChronoGraph       = ChronoGraph.new()
    //
    //     const i1            = graph1.addIdentifier(CalculatedValueGen.new({
    //         name            : 'i1',
    //         calculation     : function * () : CalculationIterator<number> {
    //             return yield ProposedOrPrevious
    //         }
    //     }))
    //
    //     const c1            = graph1.addIdentifier(CalculatedValueGen.new({
    //         name            : 'c1',
    //         lazy            : true,
    //         calculation     : function * () : CalculationIterator<number> {
    //             return (yield ProposedValueOf(i1)) != null ? 1 : 0
    //         }
    //     }))
    //
    //     graph1.commit()
    //
    //     // ----------------
    //     graph1.write(i1, 1)
    //
    //     t.is(graph1.read(c1), 1)
    // })

})
