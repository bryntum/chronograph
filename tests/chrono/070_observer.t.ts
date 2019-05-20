import { ChronoAtom, MinimalChronoAtom } from "../../src/chrono/Atom.js"
import { EffectResolutionResult } from "../../src/chrono/Effect.js"
import { ChronoGraph, MinimalChronoGraph } from "../../src/chrono/Graph.js"

declare const StartTest : any

StartTest(t => {

    t.xit('Observer should work', async t => {
        const graph : ChronoGraph   = MinimalChronoGraph.new()

        const atom1 : ChronoAtom    = graph.addNode(MinimalChronoAtom.new({ value : 0 }))
        const atom2 : ChronoAtom    = graph.addNode(MinimalChronoAtom.new({ value : 1 }))

        const atom3 : ChronoAtom    = graph.addNode(MinimalChronoAtom.new({
            calculation     : function * (proposedValue : number) {
                return (yield atom1) + (yield atom2)
            }
        }))

        await graph.propagate()

        const log = []

        const observer  = graph.observe(function* () {
            const value3    = yield atom3

            log.push(value3)
        })

        t.isDeeply(log, [ 1 ], "Correct observation history")

        await atom1.set(1)

        t.isDeeply(log, [ 1, 2 ], "Correct observation history")

        // @ts-ignore TODO remove
        observer.remove()

        await atom1.set(2)

        t.isDeeply(log, [ 1, 2 ], "Correct observation history")
    })
})
