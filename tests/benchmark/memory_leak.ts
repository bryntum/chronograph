import { Benchmark } from "../../src/benchmark/Benchmark.js"
import { GraphGenerationResult, mostlyShadowingGraph } from "./data.js"


//---------------------------------------------------------------------------------------------------------------------
export const shadowingQuarksMemoryLeak = Benchmark.new({
    name        : 'Memory leak because of shadowing quarks',

    setup       : async () : Promise<GraphGenerationResult> => {
        return mostlyShadowingGraph(50000)
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
        // return mostlyShadowingGraph(50000)
        return
    },


    cycle       : (iteration : number, cycle : number, state : GraphGenerationResult) => {
        // const { graph, boxes } = state
        //
        // graph.write(boxes[ 0 ], iteration + cycle)
        //
        // graph.propagate()
    }
})



//---------------------------------------------------------------------------------------------------------------------
export const runAllMemoryLeak = async () => {
    await shadowingQuarksMemoryLeak.measureTillMaxTime()
}
