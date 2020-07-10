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
export class MutatingGraphBenchmark extends GraphlessBenchmark {
    atomNum         : number                        = 1000
    depCount        : number                        = 1

    graphGen        : GraphGenerator<unknown>       = undefined

    async setup () {
        const me                                = this
        const dispatcher : BoxAbstract<number>  = this.graphGen.box(0)

        let boxes : BoxAbstract<number>[]       = [ dispatcher ]

        const res                               = { boxes, counter : 0 }

        for (let i = 1; i < this.depCount; i++) {
            boxes.push(this.graphGen.box(0))
        }

        for (let i = this.depCount; i < this.atomNum; i++) {
            const box = this.graphGen.computed(
                function () {
                    res.counter++

                    let sum = 0

                    for (let i = 1 + dispatcher.READ(); i <= me.depCount; i += 2) {
                        sum     += boxes[ this - i ].READ() % 10000
                    }

                    return sum
                },
                i
            )

            boxes.push(box)
        }

        return res
    }


    cycle (iteration : number, cycle : number, setup : GraphGenerationResult) {
        const { boxes } = setup

        boxes[ 0 ].WRITE((iteration + cycle) % 2)

        for (let i = 1; i < this.depCount; i++)
            boxes[ i ].WRITE((iteration + cycle + i) % 10)

        for (let k = 0; k < boxes.length; k++) boxes[ k ].READ()
    }
}


//---------------------------------------------------------------------------------------------------------------------
const mutatingGraphChronoGraph2 = MutatingGraphBenchmark.new({
    name        : 'Mutating graph - ChronoGraph2',
    atomNum     : 1000,
    depCount    : 50,
    graphGen    : graphGeneratorChronoGraph2
})

const mutatingGraphMobx = MutatingGraphBenchmark.new({
    name        : 'Mutating graph - Mobx',
    atomNum     : 1000,
    depCount    : 50,
    graphGen    : graphGeneratorMobx
})

export const run = async () => {
    const runInfoChronoGraph2   = await mutatingGraphChronoGraph2.measureTillMaxTime()
    const runInfoMobx           = await mutatingGraphMobx.measureFixed(runInfoChronoGraph2.cyclesCount, runInfoChronoGraph2.samples.length)

    if (runInfoMobx.info.result !== runInfoChronoGraph2.info.result) throw new Error("Results in last box differ")
    if (runInfoMobx.info.totalCount !== runInfoChronoGraph2.info.totalCount) throw new Error("Total number of calculations differ")
}

launchIfStandaloneProcess(run, 'mutating_graph')
