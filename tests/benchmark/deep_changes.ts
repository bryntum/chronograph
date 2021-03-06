import { Benchmark } from "../../src/benchmark/Benchmark.js"
import { deepGraphGen, deepGraphGenShared, deepGraphSync, GraphGenerationResult, mobxGraph, MobxGraphGenerationResult } from "./data.js"

//---------------------------------------------------------------------------------------------------------------------
type PostBenchInfo = {
    totalCount      : number
    result          : number
}

//---------------------------------------------------------------------------------------------------------------------
class DeepChangesChronoGraph extends Benchmark<GraphGenerationResult, PostBenchInfo> {

    gatherInfo (state : GraphGenerationResult) : PostBenchInfo {
        const { graph, boxes } = state

        return {
            totalCount      : state.counter,
            result          : graph.read(boxes[ boxes.length - 1 ])
        }
    }


    stringifyInfo (info : PostBenchInfo) : string {
        return `Total calculation: ${info.totalCount}\nResult in last box: ${info.result}`
    }


    cycle (iteration : number, cycle : number, setup : GraphGenerationResult) {
        const { graph, boxes } = setup

        graph.write(boxes[ 0 ], iteration + cycle)

        graph.commit()
        // for (let k = 0; k < boxes.length; k++) graph.read(boxes[ k ])
    }
}


//---------------------------------------------------------------------------------------------------------------------
class DeepChangesMobx extends Benchmark<MobxGraphGenerationResult, PostBenchInfo> {

    gatherInfo (state : MobxGraphGenerationResult) : PostBenchInfo {
        const { boxes } = state

        return {
            totalCount      : state.counter,
            result          : boxes[ boxes.length - 1 ].get()
        }
    }


    stringifyInfo (info : PostBenchInfo) : string {
        return `Total calculation: ${info.totalCount}\nResult in last box: ${info.result}`
    }


    cycle (iteration : number, cycle : number, setup : MobxGraphGenerationResult) {
        const { boxes } = setup

        boxes[ 0 ].set(iteration + cycle)

        // seems mobx does not have concept of eager computation, need to manually read all atoms
        for (let k = 0; k < boxes.length; k++) boxes[ k ].get()
    }
}


//---------------------------------------------------------------------------------------------------------------------
export const deepChangesGenSmall = DeepChangesChronoGraph.new({
    name        : 'Deep graph changes - generators',

    setup       : async () => {
        return deepGraphGen(1000)
    }
})


export const deepChangesSyncSmall = DeepChangesChronoGraph.new({
    name        : 'Deep graph changes - synchronous',

    setup       : async () => {
        return deepGraphSync(1000)
    }
})

export const deepChangesMobxSmall = DeepChangesMobx.new({
    name        : 'Deep graph changes - Mobx',

    setup       : async () => {
        return mobxGraph(1000)
    }
})

//---------------------------------------------------------------------------------------------------------------------
export const deepChangesGenBig = DeepChangesChronoGraph.new({
    name        : 'Deep graph changes - generators big',

    // plannedMaxTime  : 20000,
    // coolDownTimeout : 150,

    setup       : async () => {
        return deepGraphGen(100000)
    }
})

//---------------------------------------------------------------------------------------------------------------------
export const deepChangesGenBigShared = DeepChangesChronoGraph.new({
    name        : 'Deep graph changes - generators big, shared identifiers',

    // plannedMaxTime  : 20000,
    // coolDownTimeout : 150,

    setup       : async () => {
        return deepGraphGenShared(100000)
    }
})


export const runAllDeepChanges = async () => {
    const runInfo   = await deepChangesGenSmall.measureTillMaxTime()

    await deepChangesSyncSmall.measureFixed(runInfo.cyclesCount, runInfo.samples.length)
    await deepChangesMobxSmall.measureFixed(runInfo.cyclesCount, runInfo.samples.length)

    await deepChangesGenBig.measureTillMaxTime()
    await deepChangesGenBigShared.measureTillMaxTime()
}
