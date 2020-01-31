import { ChronoGraph } from "../../src/chrono/Graph.js"
import { Identifier } from "../../src/chrono/Identifier.js"

declare const StartTest : any

type GraphGenerationResult  = { graph : ChronoGraph, boxes : Identifier[] }

export const deepGraphGen = (atomNum : number = 1000) : GraphGenerationResult => {
    const graph : ChronoGraph   = ChronoGraph.new()

    let boxes       = []

    for (let i = 0; i < atomNum; i++) {
        if (i <= 3) {
            boxes.push(graph.variableNamed(i, 1))
        }
        else if (i <= 10) {
            boxes.push(graph.identifierNamed(i, function* (YIELD) {
                const input : number[] = [
                    yield boxes[0],
                    yield boxes[1],
                    yield boxes[2],
                    yield boxes[3]
                ]

                return input.reduce((sum, op) => sum + op, 0)
            }, i))
        }
        else if (i % 2 == 0) {
            boxes.push(graph.identifierNamed(i, function* (YIELD) {
                const input : number[] = [
                    yield boxes[this - 1],
                    yield boxes[this - 2],
                    yield boxes[this - 3],
                    yield boxes[this - 4]
                ]

                return input.reduce((sum, op) => (sum + op) % 10000, 0)
            }, i))
        } else {
            boxes.push(graph.identifierNamed(i, function* (YIELD) {
                const input : number[] = [
                    yield boxes[this - 1],
                    yield boxes[this - 2],
                    yield boxes[this - 3],
                    yield boxes[this - 4]
                ]

                return input.reduce((sum, op) => (sum - op) % 10000, 0)
            }, i))
        }
    }

    return { graph, boxes }
}

StartTest(t => {

    t.it('Should be possible to run several propagation in parallel', async t => {
        // const { graph, boxes }      = deepGraphGen(100000)
        //
        // const observer1  = graph.observe(function * () {
        //     yield boxes[ 5000 ]
        //     yield boxes[ 5001 ]
        //     yield boxes[ 5003 ]
        // })

        // const observer2  = graph.observe(function * () {
        //     yield boxes[ 5004 ]
        //     yield boxes[ 5005 ]
        //     yield boxes[ 5006 ]
        // })
        //
        // const propagationCompletion1    = graph.propagateAsync({ observersFirst : true })
        //
        // boxes[ 0 ].write(graph, 10)
        //
        // const propagationCompletion2    = graph.propagateAsync({ observersFirst : true })

        // t.is(await propagationCompletion2.revision.previous === await propagationCompletion1.revision, ''

        // const iden1     = graph.addIdentifier(CalculatedValueSync.new({
        //     calculation (YIELD : SyncEffectHandler) : number {
        //         count++
        //
        //         return YIELD(var1) + 1
        //     }
        // }))
        //
        // const iden2     = graph.addIdentifier(CalculatedValueSync.new({
        //     calculation (YIELD : SyncEffectHandler) : number {
        //         count++
        //
        //         return YIELD(iden1) + 1
        //     }
        // }))
        //
        // const iden3     = graph.addIdentifier(CalculatedValueSync.new({
        //     calculation (YIELD : SyncEffectHandler) : number {
        //         count++
        //
        //         return YIELD(iden2) + 1
        //     }
        // }))
        //
        // graph.propagate()
        //
        // t.is(graph.read(iden1), 2, 'Correct value')
        // t.is(graph.read(iden2), 3, 'Correct value')
        // t.is(graph.read(iden3), 4, 'Correct value')
        //
        // t.is(count, 3, 'Calculated every identifier only once')
    })
})
