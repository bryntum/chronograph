import { ChronoGraph as ChronoGraph1 } from "../../../src/chrono/Graph.js"
import { CalculationIterator } from "../../../src/chrono2/CalculationMode.js"
import { ChronoGraph as ChronoGraph2 } from "../../../src/chrono2/graph/Graph.js"
import { BoxAbstract, launchIfStandaloneProcess, ReactiveDataBenchmark, ReactiveDataGeneratorWithGenerators } from "../graphless/data_generators.js"
import {
    ReactiveDataGenerationResultWithGraph,
    ReactiveDataGeneratorChronoGraph1,
    ReactiveDataGeneratorChronoGraph2WithGraph,
    ReactiveDataGeneratorWithGraph
} from "./data_generators.js"


//---------------------------------------------------------------------------------------------------------------------
export class CommitGenBenchmark extends ReactiveDataBenchmark<ReactiveDataGenerationResultWithGraph> {
    atomNum         : number                        = 1000
    depCount        : number                        = 1

    graphGen        : ReactiveDataGeneratorWithGenerators<unknown> & ReactiveDataGeneratorWithGraph<unknown>       = undefined

    async setup () : Promise<ReactiveDataGenerationResultWithGraph> {
        const me                                = this

        let boxes : BoxAbstract<number>[]       = []

        const res                               = { boxes, counter : 0, graph : this.graphGen.graph }

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


    cycle (iteration : number, cycle : number, state : ReactiveDataGenerationResultWithGraph) {
        const { boxes, graph } = state

        for (let i = 0; i < this.depCount; i++)
            boxes[ i ].WRITE((iteration + cycle + i) % 10)

        graph.commit()
    }
}


//---------------------------------------------------------------------------------------------------------------------
const runFor = async (atomNum : number = 1000, depCount : number = 1) => {

    const chronoGraph2WithGraph = CommitGenBenchmark.new({
        // profile         : true,
        // keepLastResult  : true,
        // showSamples     : true,
        name            : `Commit in graph, atoms: ${atomNum}, deps depth: ${depCount} - ChronoGraph2`,
        atomNum         : atomNum,
        depCount        : depCount,
        graphGen        : ReactiveDataGeneratorChronoGraph2WithGraph.new({ graph : ChronoGraph2.new({ historyLimit : 0 }) })
    })

    const chronoGraph1 = CommitGenBenchmark.new({
        // profile         : true,
        // keepLastResult  : true,
        // showSamples     : true,
        name            : `Commit in graph, atoms: ${atomNum}, deps depth: ${depCount} - ChronoGraph1`,
        atomNum         : atomNum,
        depCount        : depCount,
        graphGen        : ReactiveDataGeneratorChronoGraph1.new({ graph : ChronoGraph1.new({ historyLimit : 0 }) })
    })

    const runInfoChronoGraph2WithGraph  = await chronoGraph2WithGraph.measureTillMaxTime()
    const runInfoChronoGraph1           = await chronoGraph1.measureFixed(
        runInfoChronoGraph2WithGraph.cyclesCount, runInfoChronoGraph2WithGraph.samples.length
    )

    if (runInfoChronoGraph2WithGraph.info.result !== runInfoChronoGraph1.info.result) throw new Error("Results in last box differ")
}


export const run = async () => {
    await runFor(100000, 1)
    await runFor(100000, 10)
    await runFor(100000, 100)
}

launchIfStandaloneProcess(run, 'commit_gen')
