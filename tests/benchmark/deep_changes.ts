import { Benchmark } from "../../src/benchmark/Benchmark.js"
import {
    Chrono2GenerationResult, chrono2Graph, chrono2Graph2,
    deepGraphGen,
    deepGraphGenShared,
    deepGraphSync,
    GraphGenerationResult,
    mobxGraph, mobxGraph2,
    MobxGraphGenerationResult
} from "./data.js"

//---------------------------------------------------------------------------------------------------------------------
type PostBenchInfo = {
    totalCount      : number
    result          : number
}

//---------------------------------------------------------------------------------------------------------------------
export class DeepChangesChronoGraph extends Benchmark<GraphGenerationResult, PostBenchInfo> {

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
export class DeepChangesMobx extends Benchmark<MobxGraphGenerationResult, PostBenchInfo> {

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
export class DeepChangesChrono2 extends Benchmark<Chrono2GenerationResult, PostBenchInfo> {

    gatherInfo (state : Chrono2GenerationResult) : PostBenchInfo {
        const { boxes } = state

        return {
            totalCount      : state.counter,
            result          : boxes[ boxes.length - 1 ].read()
        }
    }


    stringifyInfo (info : PostBenchInfo) : string {
        return `Total calculation: ${info.totalCount}\nResult in last box: ${info.result}`
    }


    cycle (iteration : number, cycle : number, setup : Chrono2GenerationResult) {
        const { boxes } = setup

        boxes[ 0 ].write(iteration + cycle)

        for (let k = 0; k < boxes.length; k++) boxes[ k ].read()
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

export const deepChangesMobxDeps1 = DeepChangesMobx.new({
    name        : 'Deep graph changes - Mobx, 1 dep',

    setup       : async () => {
        return mobxGraph2(1000, 1)
    }
})

export const deepChangesMobxDeps100 = DeepChangesMobx.new({
    name        : 'Deep graph changes - Mobx, 100 deps',

    setup       : async () => {
        return mobxGraph2(1000, 100)
    }
})


export const deepChangesChrono2Small = DeepChangesChrono2.new({
    name        : 'Deep graph changes - Chrono2',

    setup       : async () => {
        return chrono2Graph(1000)
    }
})

export const deepChangesChrono2Deps1 = DeepChangesChrono2.new({
    name        : 'Deep graph changes - Chrono2, 1 dep',

    setup       : async () => {
        return chrono2Graph2(1000, 1)
    }
})

export const deepChangesChrono2Deps100 = DeepChangesChrono2.new({
    name        : 'Deep graph changes - Chrono2, 100 deps',

    setup       : async () => {
        return chrono2Graph2(1000, 100)
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
    await deepChangesChrono2Small.measureTillMaxTime()
    await deepChangesMobxSmall.measureTillMaxTime()

    await deepChangesChrono2Deps1.measureTillMaxTime()
    await deepChangesMobxDeps1.measureTillMaxTime()

    await deepChangesChrono2Deps100.measureTillMaxTime()
    await deepChangesMobxDeps100.measureTillMaxTime()


    // console.profileEnd()
    const runInfo   = await deepChangesGenSmall.measureTillMaxTime()
    //
    // // await deepChangesSyncSmall.measureFixed(runInfo.cyclesCount, runInfo.samples.length)
    await deepChangesMobxSmall.measureFixed(runInfo.cyclesCount, runInfo.samples.length)
    await deepChangesChrono2Small.measureFixed(runInfo.cyclesCount, runInfo.samples.length)
    //
    // await deepChangesGenBig.measureTillMaxTime()
    // await deepChangesGenBigShared.measureTillMaxTime()
}
