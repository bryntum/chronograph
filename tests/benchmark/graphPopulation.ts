import { Benchmark } from "../../src/benchmark/Benchmark.js"
import { deepGraphGen, deepGraphSync } from "./data.js"


export const graphPopulationGen = Benchmark.new({
    name        : 'Graph population - generators',

    cycle       : (iteration : number, cycle : number, setup : any) => {
        deepGraphGen(100000)
    }
})


export const graphPopulationSync = Benchmark.new({
    name        : 'Graph population - synchronous',

    cycle       : (iteration : number, cycle : number, setup : any) => {
        deepGraphSync(100000)
    }
})
