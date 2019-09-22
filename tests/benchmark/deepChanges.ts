import { Benchmark } from "../../src/benchmark/Benchmark.js"
import { deepGraphGen, deepGraphSync, GraphGenerationResult } from "./data.js"

type PostBenchInfo = {
    totalCount      : number
    result          : number
}

class DeepChanges extends Benchmark<GraphGenerationResult, PostBenchInfo> {

    // gatherInfo (state : GraphGenerationResult) : PostBenchInfo {
    //     const { graph, boxes } = state
    //
    //     return {
    //         totalCount      : state.counter,
    //         result          : graph.read(boxes[ boxes.length - 1 ])
    //     }
    // }
    //
    //
    // stringifyInfo (info : PostBenchInfo) : string {
    //     return `Total calculation: ${info.totalCount}\nResult in last box: ${info.result}`
    // }


    cycle (iteration : number, cycle : number, setup : GraphGenerationResult) {
        const { graph, boxes } = setup

        graph.write(boxes[ 0 ], iteration + cycle)

        graph.propagateSync()
    }
}


export const deepChangesGen = DeepChanges.new({
    name        : 'Deep graph changes - generators',

    setup       : () => {
        return deepGraphGen(100000)
    }
})


export const deepChangesSync = DeepChanges.new({
    name        : 'Deep graph changes - generators',

    setup       : () => {
        return deepGraphSync(100000)
    }
})

deepChangesGen.measure()
