import { Benchmark } from "../../src/benchmark/Benchmark.js"
import { Chrono2GenerationResult, MobxGraphGenerationResult } from "../data.js"
import {
    chrono2MutatingGraph,
    chrono2MassiveIncoming,
    chrono2MassiveOutgoing,
    mobxMassiveIncoming,
    mobxMassiveOutgoing,
    mobxMutatingGraph, chrono2MassiveIncomingAndOutgoing, mobxMassiveIncomingAndOutgoing
} from "./data_generation.js"
import { DeepChangesChrono2, DeepChangesMobx } from "../deep_changes.js"

//---------------------------------------------------------------------------------------------------------------------
export const mobxMassiveOutgoingBench = DeepChangesMobx.new({
    name        : 'Massive outgoing - Mobx',

    setup       : async () => {
        return mobxMassiveOutgoing(10000)
    }
})

export const chrono2MassiveOutgoingBench = DeepChangesChrono2.new({
    name        : 'Massive outgoing - Chrono2',

    setup       : async () => {
        return chrono2MassiveOutgoing(10000)
    }
})

export const mobxMassiveIncomingBench = DeepChangesMobx.new({
    name        : 'Massive incoming - Mobx',

    setup       : async () => {
        return mobxMassiveIncoming(10000)
    }
})

export const chrono2MassiveIncomingBench = DeepChangesChrono2.new({
    name        : 'Massive incoming - Chrono2',

    setup       : async () => {
        return chrono2MassiveIncoming(10000)
    }
})

export const mobxMassiveIncomingAndOutgoingBench = DeepChangesMobx.new({
    name        : 'Massive incoming&outgoing - Mobx',

    setup       : async () => {
        return mobxMassiveIncomingAndOutgoing(10000)
    }
})

export const chrono2MassiveIncomingAndOutgoingBench = DeepChangesChrono2.new({
    name        : 'Massive incoming&outgoing - Chrono2',

    setup       : async () => {
        return chrono2MassiveIncomingAndOutgoing(10000)
    }
})


const atomsCount    = 1000
const depsCount     = 50

export const mobxMutatingGraphBench = Benchmark.new({
    name        : 'Mutating graph - Mobx',

    setup       : async () => {
        return mobxMutatingGraph(atomsCount, depsCount)
    },

    cycle (iteration : number, cycle : number, setup : MobxGraphGenerationResult) {
        const { boxes } = setup

        boxes[ 0 ].set((iteration + cycle) % 2)

        for (let i = 1; i < depsCount; i++)
            boxes[ i ].set((iteration + cycle) % 10)

        for (let k = 0; k < boxes.length; k++) boxes[ k ].get()
    }
})

export const chrono2MutatingGraphBench = Benchmark.new({
    name        : 'Mutating graph - Chrono2',

    setup       : async () => {
        return chrono2MutatingGraph(atomsCount, depsCount)
    },

    cycle (iteration : number, cycle : number, setup : Chrono2GenerationResult) {
        const { boxes } = setup

        boxes[ 0 ].write((iteration + cycle) % 2)

        for (let i = 1; i < depsCount; i++)
            boxes[ i ].write((iteration + cycle) % 10)

        for (let k = 0; k < boxes.length; k++) boxes[ k ].read()
    }
})



export const runAllMassive = async () => {
    await chrono2MassiveOutgoingBench.measureTillMaxTime()
    await mobxMassiveOutgoingBench.measureTillMaxTime()

    await chrono2MassiveIncomingBench.measureTillMaxTime()
    await mobxMassiveIncomingBench.measureTillMaxTime()

    await chrono2MassiveIncomingAndOutgoingBench.measureTillMaxTime()
    await mobxMassiveIncomingAndOutgoingBench.measureTillMaxTime()

    await chrono2MutatingGraphBench.measureTillMaxTime()
    await mobxMutatingGraphBench.measureTillMaxTime()
}
