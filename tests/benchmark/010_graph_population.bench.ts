import { ChronoGraph, MinimalChronoGraph } from "../../src/chrono/Graph.js"

declare const StartTest : any

StartTest(t => {

    t.it("Should be performant", async t => {
        const graph : ChronoGraph   = MinimalChronoGraph.new()

        let atomNum     = 500000

        let boxes       = []

        console.time("Build graph")
        console.profile('Build graph')

        for (let i = 0; i < atomNum; i++) {
            if (i <= 3) {
                boxes.push(graph.variableId(i, 1))
            } else {

                if (i % 2 == 0) {

                    boxes.push(graph.identifierId(i, function* () {
                        const input = [
                            yield boxes[this - 1],
                            yield boxes[this - 2],
                            yield boxes[this - 3],
                            yield boxes[this - 4]
                        ]

                        return input.reduce((sum, op) => (sum + op) % 10000, 0)
                    }, i))
                }
                else {
                    boxes.push(graph.identifierId(i, function* () {
                        const input = [
                            yield boxes[this - 1],
                            yield boxes[this - 2],
                            yield boxes[this - 3],
                            yield boxes[this - 4]
                        ]

                        return input.reduce((sum, op) => (sum - op) % 10000, 0)
                    }, i))
                }
            }
        }

        console.profileEnd()
        console.timeEnd("Build graph")
    })
})
