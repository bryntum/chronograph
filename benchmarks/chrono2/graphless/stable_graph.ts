import { ReactiveDataGeneratorChronoGraph2WithGraph } from "../graphful/data_generators.js"
import {
    BoxAbstract,
    launchIfStandaloneProcess,
    ReactiveDataBenchmark,
    ReactiveDataGenerationResult,
    ReactiveDataGenerator,
    reactiveDataGeneratorChronoGraph2,
    reactiveDataGeneratorMobx
} from "./data_generators.js"


//---------------------------------------------------------------------------------------------------------------------
export class StableGraphBenchmark extends ReactiveDataBenchmark {
    atomNum         : number                        = 1000
    depCount        : number                        = 1

    graphGen        : ReactiveDataGenerator<unknown>       = undefined

    async setup () {
        const me                                = this

        let boxes : BoxAbstract<number>[]       = []

        const res                               = { boxes, counter : 0 }

        for (let i = 0; i < this.depCount; i++) {
            boxes.push(this.graphGen.box(1))
        }

        for (let i = this.depCount; i < this.atomNum; i++) {
            boxes.push(this.graphGen.computed(function () {
                res.counter++

                let sum = 0

                for (let i = 1; i <= me.depCount; i++) {
                    sum     += boxes[ this - i ].READ() % 10000
                }

                return sum
            }, i))
        }

        return res
    }


    cycle (iteration : number, cycle : number, state : ReactiveDataGenerationResult) {
        const { boxes } = state

        for (let i = 0; i < this.depCount; i++)
            boxes[ i ].WRITE((iteration + cycle + i) % 10)

        for (let k = 0; k < boxes.length; k++) boxes[ k ].READ()
    }
}


//---------------------------------------------------------------------------------------------------------------------
const runFor = async (atomNum : number = 1000, depCount : number = 1) => {
    const chronoGraph2 = StableGraphBenchmark.new({
        name        : `Stable graph, atoms: ${atomNum}, deps depth: ${depCount} - ChronoGraph2`,
        atomNum     : atomNum,
        depCount    : depCount,
        graphGen    : reactiveDataGeneratorChronoGraph2
    })

    const mobx = StableGraphBenchmark.new({
        name        : `Stable graph, atoms: ${atomNum}, deps depth: ${depCount} - Mobx`,
        atomNum     : atomNum,
        depCount    : depCount,
        graphGen    : reactiveDataGeneratorMobx
    })

    const chronoGraph2WithGraph = StableGraphBenchmark.new({
        name        : `Stable graph, atoms: ${atomNum}, deps depth: ${depCount} - ChronoGraph2 with graph`,
        atomNum     : atomNum,
        depCount    : depCount,
        graphGen    : new ReactiveDataGeneratorChronoGraph2WithGraph()
    })

    // const chronoGraph1 = StableGraphBenchmark.new({
    //     name        : `Stable graph, atoms: ${atomNum}, deps depth: ${depCount} - ChronoGraph1`,
    //     atomNum     : atomNum,
    //     depCount    : depCount,
    //     graphGen    : new ReactiveDataGeneratorChronoGraph1()
    // })

    const runInfoChronoGraph2   = await chronoGraph2.measureTillMaxTime()
    const runInfoMobx           = await mobx.measureFixed(runInfoChronoGraph2.cyclesCount, runInfoChronoGraph2.samples.length)
    const runInfoChronoGraph2WithGraph = await chronoGraph2WithGraph.measureFixed(runInfoChronoGraph2.cyclesCount, runInfoChronoGraph2.samples.length)
    // const runInfoChronoGraph1 = await chronoGraph1.measureFixed(runInfoChronoGraph2.cyclesCount, runInfoChronoGraph2.samples.length)

    if (runInfoMobx.info.result !== runInfoChronoGraph2.info.result) throw new Error("Results in last box differ")
    if (runInfoMobx.info.totalCount !== runInfoChronoGraph2.info.totalCount) throw new Error("Total number of calculations differ")
}


export const run = async () => {
    await runFor(1000, 1)
    await runFor(1000, 10)
    await runFor(1000, 100)
}

launchIfStandaloneProcess(run, 'stable_graph')
