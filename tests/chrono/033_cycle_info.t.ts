import { HasProposedValue } from "../../src/chrono/Effect.js"
import { ChronoGraph, MinimalChronoGraph } from "../../src/chrono/Graph.js"

declare const StartTest : any

StartTest(t => {


    t.it('Should show the detailed information about the cyclic computation', async t => {
        const graph : ChronoGraph       = MinimalChronoGraph.new()

        const iden1     = graph.identifierNamed('iden1', function* (Y) {
            return yield iden2
        })

        const iden2     = graph.identifierNamed('iden2', function* (Y) {
            return yield iden1
        })

        // ----------------
        t.throwsOk(() => graph.read(iden1), /iden1.*iden2/s, 'Include identifier name in the cycle info')
    })


    t.it('Should show the detailed information about the cyclic computation', async t => {
        const graph : ChronoGraph       = MinimalChronoGraph.new()

        const dispatcher    = graph.identifierNamed('dispatcher', function* (Y) {
            const iden1HasProposed  = yield HasProposedValue(iden1)
            const iden2HasProposed  = yield HasProposedValue(iden2)

            return 'result'
        })

        const iden1         = graph.identifierNamed('iden1', function* (Y) {
            const disp          = yield dispatcher

            return yield iden2
        })

        const iden2         = graph.identifierNamed('iden2', function* (Y) {
            const disp          = yield dispatcher

            return yield iden1
        })

        // ----------------
        t.throwsOk(() => graph.read(iden1), /iden1.*iden2/s, 'Include identifier name in the cycle info')
    })

})
