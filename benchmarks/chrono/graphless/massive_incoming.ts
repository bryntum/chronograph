import {
    BoxAbstract,
    GraphGenerationResult,
    GraphGenerator,
    graphGeneratorChronoGraph2,
    graphGeneratorMobx,
    GraphlessBenchmark,
    launchIfStandaloneProcess
} from "./data_generators.js"


//---------------------------------------------------------------------------------------------------------------------
export class MassiveIncomingBenchmark extends GraphlessBenchmark {
    atomNum         : number                        = 1000

    graphGen        : GraphGenerator<unknown>       = undefined

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


    cycle (iteration : number, cycle : number, setup : GraphGenerationResult) {
        const { boxes } = setup

        boxes[ 0 ].WRITE(iteration + cycle)

        for (let k = 0; k < boxes.length; k++) boxes[ k ].READ()
    }
}


//---------------------------------------------------------------------------------------------------------------------
const massiveIncomingChronoGraph2 = MassiveIncomingBenchmark.new({
    name        : 'Massive incoming - ChronoGraph2',
    atomNum     : 10000,
    graphGen    : graphGeneratorChronoGraph2
})

const massiveIncomingMobx = MassiveIncomingBenchmark.new({
    name        : 'Massive incoming - Mobx',
    atomNum     : 10000,
    graphGen    : graphGeneratorMobx
})

export const run = async () => {
    const runInfoChronoGraph2   = await massiveIncomingChronoGraph2.measureTillMaxTime()
    const runInfoMobx           = await massiveIncomingMobx.measureFixed(runInfoChronoGraph2.cyclesCount, runInfoChronoGraph2.samples.length)

    if (runInfoMobx.info.result !== runInfoChronoGraph2.info.result) throw new Error("Results in last box differ")
    if (runInfoMobx.info.totalCount !== runInfoChronoGraph2.info.totalCount) throw new Error("Total number of calculations differ")
}

launchIfStandaloneProcess(run, 'massive_incoming')
