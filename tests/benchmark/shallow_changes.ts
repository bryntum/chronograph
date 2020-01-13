import { Benchmark } from "../../src/benchmark/Benchmark.js"
import { deepGraphGen, deepGraphSync, GraphGenerationResult, mobxGraph, MobxGraphGenerationResult } from "./data.js"

//---------------------------------------------------------------------------------------------------------------------
type PostBenchInfo = {
    totalCount      : number
    result          : number
}

//---------------------------------------------------------------------------------------------------------------------
class ShallowChangesChronoGraph extends Benchmark<GraphGenerationResult, PostBenchInfo> {

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
        graph.write(boxes[ 1 ], 15 - (iteration + cycle))

        graph.commit()
    }
}


//---------------------------------------------------------------------------------------------------------------------
class ShallowChangesMobx extends Benchmark<MobxGraphGenerationResult, PostBenchInfo> {

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
        boxes[ 1 ].set(15 - (iteration + cycle))

        // seems mobx does not have concept of eager computation, need to manually read all atoms
        for (let k = 0; k < boxes.length; k++) boxes[ k ].get()
    }
}

//---------------------------------------------------------------------------------------------------------------------
export const shallowChangesGen = ShallowChangesChronoGraph.new({
    name        : 'Shallow graph changes - generators',

    setup       : async () => {
        return deepGraphGen(1300)
    }
})


export const shallowChangesSync = ShallowChangesChronoGraph.new({
    name        : 'Shallow graph changes - synchronous',

    setup       : async () => {
        return deepGraphSync(1300)
    }
})

export const shallowChangesMobx = ShallowChangesMobx.new({
    name        : 'Shallow graph changes - Mobx',

    setup       : async () => {
        return mobxGraph(1300)
    }
})


//---------------------------------------------------------------------------------------------------------------------
export const shallowChangesGenBig = ShallowChangesChronoGraph.new({
    name        : 'Shallow graph changes - generators big',

    setup       : async () => {
        return deepGraphGen(100000)
    }
})


//---------------------------------------------------------------------------------------------------------------------
export const runAllShallowChanges = async () => {
    const runInfo   = await shallowChangesGen.measureTillMaxTime()

    await shallowChangesSync.measureFixed(runInfo.cyclesCount, runInfo.samples.length)
    await shallowChangesMobx.measureFixed(runInfo.cyclesCount, runInfo.samples.length)

    await shallowChangesGenBig.measureTillMaxTime()
}
