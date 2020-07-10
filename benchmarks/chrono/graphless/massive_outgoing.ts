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


    cycle (iteration : number, cycle : number, setup : GraphGenerationResult) {
        const { boxes } = setup

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

export const run = async () => {
    // Mobx first
    const runInfo   = await massiveOutgoingMobx.measureTillMaxTime()

    await massiveOutgoingChronoGraph2.measureFixed(runInfo.cyclesCount, runInfo.samples.length)

    // ChronoGraph2 first
    // const runInfo   = await massiveOutgoingChronoGraph2.measureTillMaxTime()
    //
    // await massiveOutgoingMobx.measureFixed(runInfo.cyclesCount, runInfo.samples.length)
}

launchIfStandaloneProcess(run)
