import { Benchmark } from "../../src/benchmark/Benchmark.js"
import { deepGraphGen, deepGraphSync, mobxGraph, replicaGen } from "./data.js"


//---------------------------------------------------------------------------------------------------------------------
export const graphPopulationGen = Benchmark.new({
    name        : 'Graph population 100k - generators',

    cycle       : (iteration : number, cycle : number, setup : any) => {
        deepGraphGen(100000)
    }
})


export const graphPopulationSync = Benchmark.new({
    name        : 'Graph population 100k - synchronous',

    cycle       : (iteration : number, cycle : number, setup : any) => {
        deepGraphSync(100000)
    }
})


export const graphPopulationMobx = Benchmark.new({
    name        : 'Graph population 100k - Mobx',

    cycle       : (iteration : number, cycle : number, setup : any) => {
        mobxGraph(100000)
    }
})


//---------------------------------------------------------------------------------------------------------------------
export const replicaPopulation = Benchmark.new({
    name        : 'Replica population 125k',

    cycle       : (iteration : number, cycle : number, setup : any) => {
        replicaGen(5000)
    }
})



//---------------------------------------------------------------------------------------------------------------------
export const runAllGraphPopulation = async () => {
    await graphPopulationGen.measureTillRelativeMoe()
    await graphPopulationSync.measureTillRelativeMoe()
    await graphPopulationMobx.measureTillRelativeMoe()

    await replicaPopulation.measureTillRelativeMoe()
}
