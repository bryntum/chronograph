import { GraphfulGeneratorChronoGraph1, GraphfulGeneratorChronoGraph2 } from "../graphful/data_generators.js"
import {
    BoxAbstract,
    GraphGenerationResult,
    GraphGenerator,
    graphGeneratorChronoGraph2,
    graphGeneratorMobx,
    GraphlessBenchmark, launchIfStandaloneProcess
} from "./data_generators.js"


//---------------------------------------------------------------------------------------------------------------------
export class MassiveOutgoingBenchmark extends GraphlessBenchmark {
    atomNum         : number                        = 1000

    graphGen        : GraphGenerator<unknown>       = undefined

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


    cycle (iteration : number, cycle : number, state : GraphGenerationResult) {
        const { boxes } = state

        boxes[ 0 ].WRITE(iteration + cycle)

        for (let k = 0; k < boxes.length; k++) boxes[ k ].READ()
    }
}


//---------------------------------------------------------------------------------------------------------------------
const massiveOutgoingChronoGraph2 : MassiveOutgoingBenchmark = MassiveOutgoingBenchmark.new({
    name        : 'Massive outgoing - ChronoGraph2',
    atomNum     : 10000,
    graphGen    : graphGeneratorChronoGraph2
})

const massiveOutgoingMobx : MassiveOutgoingBenchmark = MassiveOutgoingBenchmark.new({
    name        : 'Massive outgoing - Mobx',
    atomNum     : 10000,
    graphGen    : graphGeneratorMobx
})

const massiveOutgoingChronoGraph2Graphful : MassiveOutgoingBenchmark = MassiveOutgoingBenchmark.new({
    name        : 'Massive outgoing - ChronoGraph2 with graph',
    atomNum     : 10000,
    graphGen    : new GraphfulGeneratorChronoGraph2()
})

const massiveOutgoingChronoGraph1 : MassiveOutgoingBenchmark = MassiveOutgoingBenchmark.new({
    name        : 'Massive outgoing - ChronoGraph1',
    atomNum     : 10000,
    graphGen    : new GraphfulGeneratorChronoGraph1()
})

export const run = async () => {
    const runInfoChronoGraph2   = await massiveOutgoingChronoGraph2.measureTillMaxTime()
    const runInfoMobx           = await massiveOutgoingMobx.measureFixed(runInfoChronoGraph2.cyclesCount, runInfoChronoGraph2.samples.length)
    const runInfoChronoGraph2Graphful = await massiveOutgoingChronoGraph2Graphful.measureFixed(runInfoChronoGraph2.cyclesCount, runInfoChronoGraph2.samples.length)
    const runInfoChronoGraph1   = await massiveOutgoingChronoGraph1.measureFixed(runInfoChronoGraph2.cyclesCount, runInfoChronoGraph2.samples.length)

    if (runInfoMobx.info.result !== runInfoChronoGraph2.info.result) throw new Error("Results in last box differ")
    if (runInfoMobx.info.totalCount !== runInfoChronoGraph2.info.totalCount) throw new Error("Total number of calculations differ")
}

launchIfStandaloneProcess(run, 'massive_outgoing')
