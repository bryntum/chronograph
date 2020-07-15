import { BoxAbstract, launchIfStandaloneProcess, ReactiveDataBenchmark } from "../graphless/data_generators.js"
import {
    ReactiveDataGenerationResultWithGraph,
    ReactiveDataGeneratorChronoGraph1,
    ReactiveDataGeneratorChronoGraph2WithGraph,
    ReactiveDataGeneratorWithGraph
} from "./data_generators.js"


//---------------------------------------------------------------------------------------------------------------------
export class RejectBenchmark extends ReactiveDataBenchmark<ReactiveDataGenerationResultWithGraph> {
    atomNum         : number                        = 1000
    depCount        : number                        = 1

    graphGen        : ReactiveDataGeneratorWithGraph<unknown>       = undefined

    async setup () : Promise<ReactiveDataGenerationResultWithGraph> {
        const me                                = this

        let boxes : BoxAbstract<number>[]       = []

        const res                               = { boxes, counter : 0, graph : this.graphGen.graph }

        for (let i = 0; i < this.depCount; i++) {
            boxes.push(this.graphGen.box(1))
        }

        for (let i = this.depCount; i < this.atomNum; i++) {
            boxes.push(this.graphGen.computedStrict(function () {
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


    cycle (iteration : number, cycle : number, state : ReactiveDataGenerationResultWithGraph) {
        const { boxes, graph } = state

        for (let i = 0; i < this.depCount; i++)
            boxes[ i ].WRITE((iteration + cycle + i) % 10)

        graph.reject()
    }
}


//---------------------------------------------------------------------------------------------------------------------
const runFor = async (atomNum : number = 1000, depCount : number = 1) => {

    const chronoGraph2WithGraph = RejectBenchmark.new({
        name        : `Reject in graph, atoms: ${atomNum}, deps depth: ${depCount} - ChronoGraph2 with graph`,
        atomNum     : atomNum,
        depCount    : depCount,
        graphGen    : new ReactiveDataGeneratorChronoGraph2WithGraph()
    })

    const chronoGraph1 = RejectBenchmark.new({
        name        : `Reject in graph, atoms: ${atomNum}, deps depth: ${depCount} - ChronoGraph1`,
        atomNum     : atomNum,
        depCount    : depCount,
        graphGen    : new ReactiveDataGeneratorChronoGraph1()
    })

    const runInfoChronoGraph2WithGraph  = await chronoGraph2WithGraph.measureTillMaxTime()
    const runInfoChronoGraph1           = await chronoGraph1.measureFixed(
        runInfoChronoGraph2WithGraph.cyclesCount, runInfoChronoGraph2WithGraph.samples.length
    )

    const chrono2Boxes      = runInfoChronoGraph2WithGraph.finalState.boxes
    const chrono1Boxes      = runInfoChronoGraph1.finalState.boxes

    for (let i = 0; i < depCount; i++) {
        if (chrono2Boxes[ i ].READ() !== 1) throw new Error("Invalid value in graph, ChronoGraph2")
        if (chrono1Boxes[ i ].READ() !== 1) throw new Error("Invalid value in graph, ChronoGraph1")
    }
}


export const run = async () => {
    await runFor(1000, 1)
    await runFor(1000, 10)
    await runFor(1000, 100)
}

launchIfStandaloneProcess(run, 'reject')
