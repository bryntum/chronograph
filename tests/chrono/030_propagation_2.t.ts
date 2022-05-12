import { HasProposedValue, ProposedOrPrevious } from "../../src/chrono/Effect.js"
import { ChronoGraph } from "../../src/chrono/Graph.js"

declare const StartTest : any

StartTest(t => {

    t.it('Should be smart about counting incoming edges from different walk epoch', async t => {
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
        // these writes will give `c3` entry `edgesFlow` 1
        graph.write(i1, 5)
        graph.write(i2, 5)

        // this will bump the walk epoch
        t.is(graph.read(c1), 10, 'Correct value')

        // this write will give `c3` entry +1 to edge flow, but in another epoch, so if we clear the `edgesFlow` on new epoch
        // the total flow will be 1, and `c3` quark would be eliminated when `c2` did not change
        // we were clearing the edgeFlow on epoch change, however this is a counter-example for such clearing
        // TODO needs some proper solution for edgesFlow + walk epoch combination
        graph.write(i3, 1)

        t.isDeeply(nodes.map(node => graph.read(node)), [ 5, 5, 1, 10, 11, 12 ], "Correct result calculated #2")
    })


    t.it('Should ignore eliminated quarks from previous calculations, which still remains in stack', async t => {
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
            return (yield c2) + 1
        })

        graph.commit()

        // ----------------
        const nodes             = [ i1, i2, i3, c1, c2, c3 ]

        t.isDeeply(nodes.map(node => graph.read(node)), [ 0, 10, 0, 10, 11, 12 ], "Correct result calculated #1")

        // ----------------
        // these writes will create an entry for `c3`
        graph.write(i1, 5)
        graph.write(i2, 5)
        graph.write(i3, 1)

        // this read will eliminate the entry for `c3` w/o computing it, since its only dependency `c2` didn't change
        // but, it will remain in the stack, with edgesFlow < 0
        // thus, at some point it will be processed by the transaction, possibly eliminating the "real" `c3` entry created
        // by the following write
        t.is(graph.read(c3), 12, 'Correct value')

        graph.write(i2, 4)

        graph.commit()

        t.isDeeply(nodes.map(node => graph.read(node)), [ 5, 4, 1, 9, 10, 11 ], "Correct result calculated #2")
    })


    // TODO this should "just work" causes troubles in edge cases in engine
    t.xit('Should recalculate atoms, depending on the presence of the proposed value', async t => {
        const graph : ChronoGraph       = ChronoGraph.new()

        const i1        = graph.variableNamed('i1', 0)
        const i2        = graph.variableNamed('i2', 10)

        const c1        = graph.identifierNamed('c1', function* () {
            return yield ProposedOrPrevious
        })

        graph.write(c1, 11)

        let counter     = 0

        const c2        = graph.identifierNamed('c2', function* () {
            counter++

            const has = yield HasProposedValue(c1)

            return has ? 1 : yield i2
        })

        graph.commit()

        // ----------------
        const nodes             = [ i1, i2, c1, c2 ]

        t.isDeeply(nodes.map(node => graph.read(node)), [ 0, 10, 11, 1 ], "Correct result calculated #1")

        t.is(counter, 1)

        // // ----------------
        graph.write(i2, 20)
        counter = 0

        graph.commit()

        t.is(counter, 1)

        t.isDeeply(nodes.map(node => graph.read(node)), [ 0, 20, 11, 20 ], "Correct result calculated #1")
    })
})
