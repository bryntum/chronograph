import { BoxAbstract, launchIfStandaloneProcess, ReactiveDataBenchmark } from "../graphless/data_generators.js"
import {
    ReactiveDataGenerationResultWithGraph,
    ReactiveDataGeneratorChronoGraph1,
    ReactiveDataGeneratorChronoGraph2WithGraph,
    ReactiveDataGeneratorWithGraph
} from "./data_generators.js"

import { ChronoGraph as ChronoGraph1 } from "../../../src/chrono/Graph.js"
import { ChronoGraph as ChronoGraph2 } from "../../../src/chrono2/graph/Graph.js"


//---------------------------------------------------------------------------------------------------------------------
export class UndoBenchmark extends ReactiveDataBenchmark<ReactiveDataGenerationResultWithGraph> {
    atomNum         : number                        = 1000
    depCount        : number                        = 1
    historyLimit    : number                        = 1

    graphGen        : ReactiveDataGeneratorWithGraph<unknown>       = undefined

    async setup () : Promise<ReactiveDataGenerationResultWithGraph> {
        const me                                = this

        const graph                             = this.graphGen.graph

        let boxes : BoxAbstract<number>[]       = []

        const res                               = { boxes, counter : 0, graph : this.graphGen.graph }

        for (let i = 0; i < this.depCount; i++) {
            boxes.push(this.graphGen.box(-100))
        }

        for (let i = this.depCount; i < this.atomNum; i++) {
            boxes.push(this.graphGen.computedStrict(function () {
                res.counter++

                let sum = 0

                for (let i = 1; i <= me.depCount; i++) {
                    sum     += boxes[ this - i ].READ() % 100
                }

                return sum
            }, i))
        }

        graph.commit()

        for (let h = 0; h < this.historyLimit; h++) {
            for (let i = 0; i < this.depCount; i++) boxes[ i ].WRITE(h * 10000 + i)

            graph.commit()
        }

        return res
    }


    cycle (iteration : number, cycle : number, state : ReactiveDataGenerationResultWithGraph) {
        const { boxes, graph } = state

        for (let h = 0; h < this.historyLimit; h++) {
            graph.undo()

            // for (let k = 0; k < boxes.length; k++) boxes[ k ].READ()
        }

        for (let h = 0; h < this.historyLimit; h++) {
            graph.redo()

            // for (let k = 0; k < boxes.length; k++) boxes[ k ].READ()
        }
    }
}


//---------------------------------------------------------------------------------------------------------------------
const runFor = async (atomNum : number = 1000, depCount : number = 1, historyLimit : number = 1) => {

    const chronoGraph2WithGraph = UndoBenchmark.new({
        // profile         : true,
        name            : `Undo in graph, history: ${historyLimit}, atoms: ${atomNum}, deps depth: ${depCount} - ChronoGraph2`,
        atomNum         : atomNum,
        depCount        : depCount,
        historyLimit    : historyLimit,
        graphGen        : ReactiveDataGeneratorChronoGraph2WithGraph.new({ graph : ChronoGraph2.new({ historyLimit : 1 }) })
    })

    // actually undo/redo implementation in ChronoGraph1 is not comparable to ChronoGraph2
    // because it does not propagate the changes outside of the graph (which requires
    // iterating over all changed quarks and their outgoing edges)
    // so comparison is rather useless, except controlling the result in last box
    const chronoGraph1 = UndoBenchmark.new({
        // profile         : true,
        name            : `Undo in graph, history: ${historyLimit}, atoms: ${atomNum}, deps depth: ${depCount} - ChronoGraph1`,
        atomNum         : atomNum,
        depCount        : depCount,
        historyLimit    : historyLimit,
        graphGen        : ReactiveDataGeneratorChronoGraph1.new({ graph : ChronoGraph1.new({ historyLimit : 1 }) })
    })

    const runInfoChronoGraph2WithGraph  = await chronoGraph2WithGraph.measureTillMaxTime()
    const runInfoChronoGraph1           = await chronoGraph1.measureFixed(
        runInfoChronoGraph2WithGraph.cyclesCount, runInfoChronoGraph2WithGraph.samples.length
    )

    if (runInfoChronoGraph2WithGraph.info.result !== runInfoChronoGraph1.info.result) throw new Error("Results in last box differ")
}


export const run = async () => {
    await runFor(1000, 1, 5)
    await runFor(1000, 10, 5)
    await runFor(1000, 100, 5)
}

launchIfStandaloneProcess(run, 'undo')
