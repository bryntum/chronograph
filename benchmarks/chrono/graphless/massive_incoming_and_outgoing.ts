import {
    BoxAbstract,
    GraphGenerationResult,
    GraphGenerator,
    graphGeneratorChronoGraph2,
    graphGeneratorMobx,
    GraphlessBenchmark, launchIfStandaloneProcess
} from "./data_generators.js"
import { MassiveIncomingBenchmark } from "./massive_incoming.js"


//---------------------------------------------------------------------------------------------------------------------
export class MassiveIncomingAndOutgoingBenchmark extends GraphlessBenchmark {
    atomNum         : number                        = 1000

    graphGen        : GraphGenerator<unknown>       = undefined

    async setup () {
        let boxes : BoxAbstract<number>[]       = []
        const res                               = { boxes, counter : 0 }

        const source                            = this.graphGen.box(0)
        let outgoing : BoxAbstract<number>[]    = []

        for (let i = 0; i < this.atomNum; i++) {
            outgoing.push(this.graphGen.computed(function () {
                res.counter++

                return source.READ() * this
            }, i))
        }

        const final = this.graphGen.computed(function () {
            res.counter++

            let sum = 0

            for (let i = 0; i < outgoing.length; i++) {
                sum += outgoing[ i ].READ()
            }

            return sum
        })

        boxes.push(source, ...outgoing, final)

        return res
    }


    cycle (iteration : number, cycle : number, setup : GraphGenerationResult) {
        const { boxes } = setup

        boxes[ 0 ].WRITE(iteration + cycle)

        for (let k = 0; k < boxes.length; k++) boxes[ k ].READ()
    }
}


//---------------------------------------------------------------------------------------------------------------------
const massiveIncomingAndOutgoingChronoGraph2 = MassiveIncomingAndOutgoingBenchmark.new({
    name        : 'Massive incoming&outgoing - ChronoGraph2',
    atomNum     : 10000,
    graphGen    : graphGeneratorChronoGraph2
})

const massiveIncomingAndOutgoingMobx = MassiveIncomingAndOutgoingBenchmark.new({
    name        : 'Massive incoming&outgoing - Mobx',
    atomNum     : 10000,
    graphGen    : graphGeneratorMobx
})

export const run = async () => {
    const runInfoChronoGraph2   = await massiveIncomingAndOutgoingChronoGraph2.measureTillMaxTime()
    const runInfoMobx           = await massiveIncomingAndOutgoingMobx.measureFixed(runInfoChronoGraph2.cyclesCount, runInfoChronoGraph2.samples.length)

    if (runInfoMobx.info.result !== runInfoChronoGraph2.info.result) throw new Error("Results in last box differ")
    if (runInfoMobx.info.totalCount !== runInfoChronoGraph2.info.totalCount) throw new Error("Total number of calculations differ")
}

launchIfStandaloneProcess(run, 'massive_incoming_and_outgoing')
