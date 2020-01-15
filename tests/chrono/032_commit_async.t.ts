import { ChronoGraph, MinimalChronoGraph } from "../../src/chrono/Graph.js"
import { CalculatedValueGen, CalculatedValueGenConstructor } from "../../src/chrono/Identifier.js"
import { delay } from "../../src/util/Helpers.js"

declare const StartTest : any

const randomDelay = () => delay(Math.random() * 50)

StartTest(t => {

    t.it('Should support the asynchronous calculations flow', async t => {
        const graph : ChronoGraph       = MinimalChronoGraph.new()

        const i1        = graph.variableNamed('i1', 0)
        const i2        = graph.variableNamed('i2', 10)
        const i3        = graph.variableNamed('i3', 0)

        const c1        = graph.addIdentifier(CalculatedValueGen.new({
            sync    : false,
            name    : 'c1',
            *calculation () {
                yield randomDelay()

                return (yield i1) + (yield i2)
            }
        }))

        const c2        = graph.addIdentifier(CalculatedValueGen.new({
            sync    : false,
            name    : 'c2',
            *calculation () {
                yield randomDelay()

                return (yield c1) + 1
            }
        }))

        const c3        = graph.addIdentifier(CalculatedValueGen.new({
            name    : 'c3',
            sync    : false,
            *calculation () {
                yield randomDelay()

                return (yield c2) + (yield i3)
            }
        }))

        await graph.commitAsync()

        // ----------------
        const nodes             = [ i1, i2, i3, c1, c2, c3 ]

        t.isDeeply(nodes.map(node => graph.get(node)), [ 0, 10, 0, 10, 11, 11 ], "Correct result calculated #1")

        // ----------------
        graph.write(i1, 5)
        graph.write(i2, 5)

        const c1v               = graph.get(c1)

        t.isInstanceOf(c1v, Promise, "Returns promise for async calculation")

        t.is(await c1v, 10, 'Promise resolved correctly')

        // ----------------
        t.isInstanceOf(graph.get(c2), Promise, "Currently c2 will always be marked as potentially dirty with promise on read")

        await graph.commitAsync()

        t.isDeeply(nodes.map(node => graph.get(node)), [ 5, 5, 0, 10, 11, 11 ], "Correct result calculated #1")

        graph.write(i3, 1)

        t.isDeeply([ i1, i2, i3, c1, c2 ].map(node => graph.get(node)), [ 5, 5, 1, 10, 11 ], "Correct result calculated #2")

        const c3v               = graph.get(c3)

        t.isInstanceOf(c3v, Promise, "Returns promise for async calculation")

        t.is(await c3v, 12, 'Promise resolved correctly')
    })


    t.it('Repeating calls to `commitAsync` should wait till previous one to complete', async t => {
        const graph : ChronoGraph       = MinimalChronoGraph.new()

        const i1        = graph.variableNamed('i1', 0)
        const i2        = graph.variableNamed('i2', 10)
        const i3        = graph.variableNamed('i3', 0)

        const c1        = graph.addIdentifier(CalculatedValueGen.new({
            sync    : false,
            name    : 'c1',
            *calculation () {
                yield randomDelay()

                return (yield i1) + (yield i2)
            }
        }))

        const c2        = graph.addIdentifier(CalculatedValueGen.new({
            sync    : false,
            name    : 'c2',
            *calculation () {
                yield randomDelay()

                return (yield c1) + 1
            }
        }))

        const c3        = graph.addIdentifier(CalculatedValueGen.new({
            name    : 'c3',
            sync    : false,
            *calculation () {
                yield randomDelay()

                return (yield c2) + (yield i3)
            }
        }))

        await graph.commitAsync()

        // ----------------
        const nodes             = [ i1, i2, i3, c1, c2, c3 ]

        t.isDeeply(nodes.map(node => graph.get(node)), [ 0, 10, 0, 10, 11, 11 ], "Correct result calculated #1")

        // ----------------
        graph.write(i1, 1)
        graph.write(i2, 2)

        graph.commitAsync()

        await graph.commitAsync()

        t.isDeeply(nodes.map(node => graph.get(node)), [ 1, 2, 0, 3, 4, 4 ], "Correct result calculated #2")
    })

})
