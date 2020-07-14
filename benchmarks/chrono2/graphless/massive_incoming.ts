import { ReactiveDataGeneratorChronoGraph1, ReactiveDataGeneratorChronoGraph2WithGraph } from "../graphful/data_generators.js"
import {
    BoxAbstract,
    ReactiveDataGenerationResult,
    ReactiveDataGenerator,
    reactiveDataGeneratorChronoGraph2,
    reactiveDataGeneratorMobx,
    ReactiveDataBenchmark,
    launchIfStandaloneProcess
} from "./data_generators.js"


//---------------------------------------------------------------------------------------------------------------------
export class MassiveIncomingBenchmark extends ReactiveDataBenchmark {
    atomNum         : number                        = 1000

    graphGen        : ReactiveDataGenerator<unknown>       = undefined

    async setup () {
        const me        = this

        let boxes : BoxAbstract<number>[]   = []

        const res                           = { boxes, counter : 0 }

        for (let i = 0; i < this.atomNum; i++) {
            boxes.push(this.graphGen.box(1))
        }

        boxes.push(this.graphGen.computed(function () {
            res.counter++

            let sum = 0

            for (let i = 0; i < me.atomNum; i++) {
                sum += boxes[ i ].READ()
            }

            return sum
        }))

        return res
    }


    cycle (iteration : number, cycle : number, state : ReactiveDataGenerationResult) {
        const { boxes } = state

        for (let i = 0; i < this.atomNum; i++) {
            boxes[ i ].WRITE(iteration + cycle + i)
        }

        for (let k = 0; k < boxes.length; k++) boxes[ k ].READ()
    }
}


//---------------------------------------------------------------------------------------------------------------------
const chronoGraph2 = MassiveIncomingBenchmark.new({
    name        : 'Massive incoming - ChronoGraph2',
    atomNum     : 10000,
    graphGen    : reactiveDataGeneratorChronoGraph2
})

const mobx = MassiveIncomingBenchmark.new({
    name        : 'Massive incoming - Mobx',
    atomNum     : 10000,
    graphGen    : reactiveDataGeneratorMobx
})

const chronoGraph2WithGraph = MassiveIncomingBenchmark.new({
    name        : 'Massive incoming - ChronoGraph2 with graph',
    atomNum     : 10000,
    graphGen    : new ReactiveDataGeneratorChronoGraph2WithGraph()
})

const chronoGraph1 = MassiveIncomingBenchmark.new({
    name        : 'Massive incoming - ChronoGraph1',
    atomNum     : 10000,
    graphGen    : new ReactiveDataGeneratorChronoGraph1()
})


export const run = async () => {
    const runInfoChronoGraph2   = await chronoGraph2.measureTillMaxTime()
    const runInfoMobx           = await mobx.measureFixed(runInfoChronoGraph2.cyclesCount, runInfoChronoGraph2.samples.length)
    const runInfoChronoGraph2Graphful = await chronoGraph2WithGraph.measureFixed(runInfoChronoGraph2.cyclesCount, runInfoChronoGraph2.samples.length)
    const runInfoChronoGraph1   = await chronoGraph1.measureFixed(runInfoChronoGraph2.cyclesCount, runInfoChronoGraph2.samples.length)

    if (runInfoMobx.info.result !== runInfoChronoGraph2.info.result || runInfoChronoGraph1.info.result !== runInfoChronoGraph2.info.result)
        throw new Error("Results in last box differ")
    if (runInfoMobx.info.totalCount !== runInfoChronoGraph2.info.totalCount)
        throw new Error("Total number of calculations differ")
}

launchIfStandaloneProcess(run, 'massive_incoming')
