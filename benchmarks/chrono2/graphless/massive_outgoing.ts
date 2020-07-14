import { ReactiveDataGeneratorChronoGraph1, ReactiveDataGeneratorChronoGraph2WithGraph } from "../graphful/data_generators.js"
import {
    BoxAbstract,
    ReactiveDataGenerationResult,
    ReactiveDataGenerator,
    reactiveDataGeneratorChronoGraph2,
    reactiveDataGeneratorMobx,
    ReactiveDataBenchmark, launchIfStandaloneProcess
} from "./data_generators.js"


//---------------------------------------------------------------------------------------------------------------------
export class MassiveOutgoingBenchmark extends ReactiveDataBenchmark {
    atomNum         : number                        = 1000

    graphGen        : ReactiveDataGenerator<unknown>       = undefined

    async setup () {
        const source    = this.graphGen.box(0)

        let boxes : BoxAbstract<number>[]       = [ source ]

        const res       = { boxes, counter : 0 }

        for (let i = 0; i < this.atomNum; i++) {
            boxes.push(this.graphGen.computed(function () {
                res.counter++

                return source.READ() * this
            }, i))
        }

        return res
    }


    cycle (iteration : number, cycle : number, state : ReactiveDataGenerationResult) {
        const { boxes } = state

        boxes[ 0 ].WRITE(iteration + cycle)

        for (let k = 0; k < boxes.length; k++) boxes[ k ].READ()
    }
}


//---------------------------------------------------------------------------------------------------------------------
const chronoGraph2 : MassiveOutgoingBenchmark = MassiveOutgoingBenchmark.new({
    name        : 'Massive outgoing - ChronoGraph2',
    atomNum     : 10000,
    graphGen    : reactiveDataGeneratorChronoGraph2
})

const mobx : MassiveOutgoingBenchmark = MassiveOutgoingBenchmark.new({
    name        : 'Massive outgoing - Mobx',
    atomNum     : 10000,
    graphGen    : reactiveDataGeneratorMobx
})

const chronoGraph2WithGraph : MassiveOutgoingBenchmark = MassiveOutgoingBenchmark.new({
    name        : 'Massive outgoing - ChronoGraph2 with graph',
    atomNum     : 10000,
    graphGen    : new ReactiveDataGeneratorChronoGraph2WithGraph()
})

const chronoGraph1 : MassiveOutgoingBenchmark = MassiveOutgoingBenchmark.new({
    name        : 'Massive outgoing - ChronoGraph1',
    atomNum     : 10000,
    graphGen    : new ReactiveDataGeneratorChronoGraph1()
})

export const run = async () => {
    const runInfoChronoGraph2   = await chronoGraph2.measureTillMaxTime()
    const runInfoMobx           = await mobx.measureFixed(runInfoChronoGraph2.cyclesCount, runInfoChronoGraph2.samples.length)
    const runInfoChronoGraph2Graphful = await chronoGraph2WithGraph.measureFixed(runInfoChronoGraph2.cyclesCount, runInfoChronoGraph2.samples.length)
    const runInfoChronoGraph1   = await chronoGraph1.measureFixed(runInfoChronoGraph2.cyclesCount, runInfoChronoGraph2.samples.length)

    if (runInfoMobx.info.result !== runInfoChronoGraph2.info.result) throw new Error("Results in last box differ")
    if (runInfoMobx.info.totalCount !== runInfoChronoGraph2.info.totalCount) throw new Error("Total number of calculations differ")
}

launchIfStandaloneProcess(run, 'massive_outgoing')
