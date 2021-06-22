import { setCompactCounter } from "../../src/chrono2/atom/Node.js"
import { Box, BoxUnbound } from "../../src/chrono2/data/Box.js"
import { ChronoGraph } from "../../src/chrono2/graph/Graph.js"
import { GraphGen } from "../util.js"

declare const StartTest : any

setCompactCounter(1)

StartTest(t => {

    const doTest = (t : any, graphGen : GraphGen) => {
        const prefix    = graphGen.sync ? 'SYNC: ' : 'GEN: '

        t.it(prefix + 'Lazy identifier', t => {
            const var1                  = Box.new(0)

            const var2                  = Box.new(1)

            const ident1                = graphGen.calculableBox({
                lazy            : true,
                calculation : eval(graphGen.calc(function* () {
                    return (yield var1) + (yield var2)
                }))
            })

            const ident2                = graphGen.calculableBox({
                lazy            : true,
                calculation : eval(graphGen.calc(function* () {
                    return (yield ident1) + 1
                }))
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


        t.it(prefix + 'Should not use stale deep history', t => {
            const i1            = Box.new(0)
            const i2            = Box.new(1)
            const dispatcher    = Box.new(i1)

            const c1            = graphGen.calculableBox({
                lazy            : true,
                calculation : eval(graphGen.calc(function* () {
                    const box = (yield dispatcher)

                    return (yield box) + 1
                }))
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


        t.it(prefix + 'Should not use stale deep history, with commits', t => {
            const graph1 : ChronoGraph       = ChronoGraph.new()

            const i1            = BoxUnbound.new(0)
            const i2            = BoxUnbound.new(1)
            const dispatcher    = BoxUnbound.new(i1)

            const c1            = graphGen.calculableBox({
                unbound         : true,
                lazy            : true,
                calculation : eval(graphGen.calc(function* () {
                    const box = (yield dispatcher)

                    return (yield box) + 1
                }))
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


        t.it(prefix + 'Should be able to calculate lazy identifier that uses `ProposedOrPrevious` - sync', t => {
            const graph1 : ChronoGraph       = ChronoGraph.new()

            const i1            = Box.new(0)
            const i2            = Box.new(1)

            const dispatcher    = Box.new('pure')

            const c1            = graphGen.calculableBox({
                calculation : eval(graphGen.calc(function* () {
                    const dispatch : string = (yield dispatcher)

                    if (dispatch === 'pure') {
                        return (yield i1) + (yield i2)
                    } else {
                        return c1.readProposedOrPrevious()
                    }
                }))
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


        t.it(prefix + 'Should be able to calculate lazy identifier that uses `ProposedOrPrevious` - sync, with commits', t => {
            const graph1 : ChronoGraph       = ChronoGraph.new()

            const i1            = Box.new(0)
            const i2            = Box.new(1)

            const dispatcher    = Box.new('pure')

            const c1            = graphGen.calculableBox({
                lazy            : true,
                calculation : eval(graphGen.calc(function* () {
                    const dispatch : string = (yield dispatcher)

                    if (dispatch === 'pure') {
                        return (yield i1) + (yield i2)
                    } else {
                        return c1.readProposedOrPrevious()
                    }
                }))
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


        t.it(prefix + 'Should calculate lazy identifiers in the current transaction', t => {
            const graph1 : ChronoGraph       = ChronoGraph.new()

            const i1            = graphGen.calculableBox({
                name            : 'i1',
                calculation : eval(graphGen.calc(function* () {
                    return i1.readProposedOrPrevious()
                }))
            })

            const c1            = graphGen.calculableBox({
                name            : 'c1',
                lazy            : true,
                calculation : eval(graphGen.calc(function* () {
                    return i1.readProposedOrPrevious() != null ? 1 : 0
                }))
            })

            graph1.commit()

            // ----------------
            i1.write(1)

            t.is(c1.read(), 1)

            // TODO
            // graph1.commit()
            //
            // t.is(c1.read(), 0)
        })
    }

    doTest(t, GraphGen.new({ sync : true }))
    doTest(t, GraphGen.new({ sync : false }))
})
