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
export class StableGraphBenchmark extends GraphlessBenchmark {
    atomNum         : number                        = 1000
    depCount        : number                        = 1

    graphGen        : GraphGenerator<unknown>       = undefined

    async setup () {
        const me                                = this

        let boxes : BoxAbstract<number>[]       = []

        const res                               = { boxes, counter : 0 }

        for (let i = 0; i < this.depCount; i++) {
            boxes.push(this.graphGen.box(0))
        }

        for (let i = this.depCount; i < this.atomNum; i++) {
            const box = this.graphGen.computed(
                function () {
                    res.counter++

                    let sum = 0

                    for (let i = 1; i <= me.depCount; i++) {
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


    cycle (iteration : number, cycle : number, state : GraphGenerationResult) {
        const { boxes } = state

        for (let i = 0; i < this.depCount; i++)
            boxes[ i ].WRITE((iteration + cycle + i) % 10)

        for (let k = 0; k < boxes.length; k++) boxes[ k ].READ()
    }
}


//---------------------------------------------------------------------------------------------------------------------
const runFor = async (atomNum : number = 1000, depCount : number = 1) => {
    const stableGraphChronoGraph2 = StableGraphBenchmark.new({
        name        : `Stable graph, atoms: ${atomNum}, deps depth: ${depCount} - ChronoGraph2`,
        atomNum     : atomNum,
        depCount    : depCount,
        graphGen    : graphGeneratorChronoGraph2
    })

    const stableGraphMobx = StableGraphBenchmark.new({
        name        : `Stable graph, atoms: ${atomNum}, deps depth: ${depCount} - Mobx`,
        atomNum     : atomNum,
        depCount    : depCount,
        graphGen    : graphGeneratorMobx
    })

    const runInfoChronoGraph2   = await stableGraphChronoGraph2.measureTillMaxTime()
    const runInfoMobx           = await stableGraphMobx.measureFixed(runInfoChronoGraph2.cyclesCount, runInfoChronoGraph2.samples.length)

    if (runInfoMobx.info.result !== runInfoChronoGraph2.info.result) throw new Error("Results in last box differ")
    if (runInfoMobx.info.totalCount !== runInfoChronoGraph2.info.totalCount) throw new Error("Total number of calculations differ")
}


export const run = async () => {
    await runFor(1000, 1)
    await runFor(1000, 10)
    await runFor(1000, 100)
}

launchIfStandaloneProcess(run, 'stable_graph')
