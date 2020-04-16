import { Reject } from "../../src/chrono/Effect.js"
import { ChronoGraph } from "../../src/chrono/Graph.js"

declare const StartTest : any

StartTest(t => {

    t.it('Should be able to reject transaction using graph api', async t => {
        const graph : ChronoGraph       = ChronoGraph.new()

        const i1        = graph.variableNamed('i1', 0)
        const i2        = graph.variableNamed('i2', 10)
        const i3        = graph.variableNamed('i3', 0)

        const c1        = graph.identifierNamed('c1', function* () {
            return (yield i1) + (yield i2)
        })

        const c2        = graph.identifierNamed('c2', function* () {
            return (yield c1) + 1
        })

        const c3        = graph.identifierNamed('c3', function* () {
            return (yield c2) + (yield i3)
        })

        graph.commit()

        // ----------------
        const nodes             = [ i1, i2, i3, c1, c2, c3 ]

        t.isDeeply(nodes.map(node => graph.read(node)), [ 0, 10, 0, 10, 11, 11 ], "Correct result calculated #1")

        // ----------------
        graph.write(i1, 1)
        graph.write(i2, 1)
        graph.write(i3, 1)

        t.isDeeply(nodes.map(node => graph.read(node)), [ 1, 1, 1, 2, 3, 4 ], "Correct result calculated #1")

        graph.reject()

        t.isDeeply(nodes.map(node => graph.read(node)), [ 0, 10, 0, 10, 11, 11 ], "Graph state rolled back to previous commit")
    })


    t.it('Should be able to reject transaction using effect', async t => {
        const graph : ChronoGraph       = ChronoGraph.new()

        const i1        = graph.variableNamed('i1', 0)
        const i2        = graph.variableNamed('i2', 10)

        const c1        = graph.identifierNamed('c1', function* () {
            const sum : number = (yield i1) + (yield i2)

            if (sum > 10) yield Reject('Too big')

            return sum
        })

        graph.commit()

        // ----------------
        const nodes             = [ i1, i2, c1 ]

        t.isDeeply(nodes.map(node => graph.read(node)), [ 0, 10, 10 ], "Correct result calculated #1")

        // ----------------
        graph.write(i1, 8)
        graph.write(i2, 7)

        const result = graph.commit()

        t.like(result.rejectedWith.reason, /Too big/)

        t.isDeeply(nodes.map(node => graph.read(node)), [ 0, 10, 10 ], "Correct result calculated #1")
    })

})
