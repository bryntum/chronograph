import { Benchmark } from "../../src/benchmark/Benchmark.js"
import { chrono2Graph, deepGraphGen, deepGraphSync, mobxGraph, replicaGen } from "./data.js"


//---------------------------------------------------------------------------------------------------------------------
const graphSize = 100000

export const graphPopulationGen = Benchmark.new({
    name        : 'Graph population 100k - generators',

    cycle       : (iteration : number, cycle : number, setup : any) => {
        deepGraphGen(graphSize)
    }
})


export const graphPopulationSync = Benchmark.new({
    name        : 'Graph population 100k - synchronous',

    cycle       : (iteration : number, cycle : number, setup : any) => {
        deepGraphSync(graphSize)
    }
})


export const graphPopulationMobx = Benchmark.new({
    name        : 'Graph population 100k - Mobx',

    cycle       : (iteration : number, cycle : number, setup : any) => {
        mobxGraph(graphSize)
    }
})

export const graphPopulationChrono2 = Benchmark.new({
    name        : 'Graph population 100k - Chrono2',

    cycle       : (iteration : number, cycle : number, setup : any) => {
        chrono2Graph(graphSize)
    }
})


//---------------------------------------------------------------------------------------------------------------------
export const replicaPopulation = Benchmark.new({
    name        : 'Replica population 125k',

    cycle       : (iteration : number, cycle : number, setup : any) => {
        replicaGen(10000)
    }
})



//---------------------------------------------------------------------------------------------------------------------
export const runAllGraphPopulation = async () => {
    await graphPopulationGen.measureTillRelativeMoe()
    await graphPopulationSync.measureTillRelativeMoe()
    await graphPopulationMobx.measureTillRelativeMoe()
    await graphPopulationChrono2.measureTillRelativeMoe()

    await replicaPopulation.measureTillRelativeMoe()
}
