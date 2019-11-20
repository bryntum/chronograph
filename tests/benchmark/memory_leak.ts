import { Benchmark } from "../../src/benchmark/Benchmark.js"
import { MinimalChronoGraph } from "../../src/chrono/Graph.js"
import { CalculatedValueGen, Variable } from "../../src/chrono/Identifier.js"
import { GraphGenerationResult, mostlyShadowingGraph } from "./data.js"


//---------------------------------------------------------------------------------------------------------------------
export const shadowingQuarksMemoryLeak = Benchmark.new({
    name        : 'Memory leak because of shadowing quarks',

    setup       : async () : Promise<GraphGenerationResult> => {
        return mostlyShadowingGraph(100000)
    },


    cycle       : (iteration : number, cycle : number, state : GraphGenerationResult) => {
        const { graph, boxes } = state

        graph.write(boxes[ 0 ], iteration + cycle)

        graph.propagate()
    }
})


//---------------------------------------------------------------------------------------------------------------------
export const tombStonesMemoryLeak = Benchmark.new({
    name        : 'Memory leak because of tombstones',

    setup       : async () : Promise<GraphGenerationResult> => {
        return { graph : MinimalChronoGraph.new(), boxes : [], counter : 0 }
    },


    cycle       : (iteration : number, cycle : number, state : GraphGenerationResult) => {
        const { graph } = state

        const boxes     = []

        for (let i = 0; i < 50000; i++) {
            const iden1     = Variable.new({ name : i })
            const iden2     = CalculatedValueGen.new({ *calculation () { return yield iden1 } })

            boxes.push(iden1, iden2)

            graph.addIdentifier(iden1, 0)
            graph.addIdentifier(iden2)
        }

        graph.propagate()

        boxes.forEach(identifier => graph.removeIdentifier(identifier))

        graph.propagate()
    }
})



//---------------------------------------------------------------------------------------------------------------------
export const runAllMemoryLeak = async () => {
    await shadowingQuarksMemoryLeak.measureTillMaxTime()

    await tombStonesMemoryLeak.measureTillMaxTime()
}
