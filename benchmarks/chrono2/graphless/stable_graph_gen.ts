import { CalculationIterator } from "../../../src/chrono2/CalculationMode.js"
import { ReactiveDataGeneratorChronoGraph2WithGraph } from "../graphful/data_generators.js"
import {
    BoxAbstract,
    launchIfStandaloneProcess,
    ReactiveDataBenchmark,
    ReactiveDataGenerationResult,
    reactiveDataGeneratorChronoGraph2,
    ReactiveDataGeneratorWithGenerators
} from "./data_generators.js"


//---------------------------------------------------------------------------------------------------------------------
export class StableGraphBenchmarkGen extends ReactiveDataBenchmark {
    atomNum         : number                        = 1000
    depCount        : number                        = 1

    graphGen        : ReactiveDataGeneratorWithGenerators<unknown>       = undefined

    async setup () {
        const me                                = this

        let boxes : BoxAbstract<number>[]       = []

        const res                               = { boxes, counter : 0 }

        for (let i = 0; i < this.depCount; i++) {
            boxes.push(this.graphGen.box(1))
        }

        for (let i = this.depCount; i < this.atomNum; i++) {
            boxes.push(this.graphGen.computedGen(function* () : CalculationIterator<number> {
                res.counter++

                let sum = 0

                for (let i = 1; i <= me.depCount; i++) {
                    sum     += (yield boxes[ this - i ].box) % 10000
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

        for (let k = boxes.length - 1; k >= 0; k--) boxes[ k ].READ()
    }
}


//---------------------------------------------------------------------------------------------------------------------
const runFor = async (atomNum : number = 1000, depCount : number = 1) => {
    const chronoGraph2 = StableGraphBenchmarkGen.new({
        // keepLastResult : true,
        // profile     : true,
        name        : `Stable graph, generators, atoms: ${atomNum}, deps depth: ${depCount} - ChronoGraph2`,
        atomNum     : atomNum,
        depCount    : depCount,
        graphGen    : reactiveDataGeneratorChronoGraph2
    })

    const chronoGraph2WithGraph = StableGraphBenchmarkGen.new({
        // keepLastResult : true,
        // profile     : true,
        name        : `Stable graph, generators, atoms: ${atomNum}, deps depth: ${depCount} - ChronoGraph2 with graph`,
        atomNum     : atomNum,
        depCount    : depCount,
        graphGen    : new ReactiveDataGeneratorChronoGraph2WithGraph()
    })

    // const chronoGraph1 = StableGraphBenchmarkGen.new({
    //     // keepLastResult : true,
    //     // profile     : true,
    //     name        : `Stable graph, generators, atoms: ${atomNum}, deps depth: ${depCount} - ChronoGraph1`,
    //     atomNum     : atomNum,
    //     depCount    : depCount,
    //     graphGen    : new ReactiveDataGeneratorChronoGraph1()
    // })

    const runInfoChronoGraph2   = await chronoGraph2.measureTillMaxTime()
    const runInfoChronoGraph2WithGraph = await chronoGraph2WithGraph.measureFixed(runInfoChronoGraph2.cyclesCount, runInfoChronoGraph2.samples.length)
    // const runInfoChronoGraph1 = await chronoGraph1.measureFixed(runInfoChronoGraph2.cyclesCount, runInfoChronoGraph2.samples.length)

    // if (runInfoChronoGraph1.info.result !== runInfoChronoGraph2.info.result) throw new Error("Results in last box differ")
    // if (runInfoChronoGraph1.info.totalCount !== runInfoChronoGraph2.info.totalCount) throw new Error("Total number of calculations differ")
}


export const run = async () => {
    await runFor(100000, 1)
    await runFor(100000, 10)
    await runFor(100000, 100)
}

launchIfStandaloneProcess(run, 'stable_graph_gen')
