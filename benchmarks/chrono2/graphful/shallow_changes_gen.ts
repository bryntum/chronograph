import { CalculationIterator } from "../../../src/chrono2/CalculationMode.js"
import {
    BoxAbstract,
    launchIfStandaloneProcess,
    ReactiveDataBenchmark,
    ReactiveDataGenerationResult,
    reactiveDataGeneratorChronoGraph2,
    ReactiveDataGeneratorWithGenerators
} from "../graphless/data_generators.js"
import { ReactiveDataGeneratorChronoGraph1, ReactiveDataGeneratorChronoGraph2WithGraph, ReactiveDataGeneratorWithGraph } from "./data_generators.js"

//---------------------------------------------------------------------------------------------------------------------
export class ShallowChangesGenBenchmark extends ReactiveDataBenchmark {
    atomNum         : number                        = 1000
    depCount        : number                        = 1

    graphGen        : ReactiveDataGeneratorWithGenerators<unknown> & ReactiveDataGeneratorWithGraph<unknown>      = undefined

    async setup () {
        const me                                = this

        let boxes : BoxAbstract<number>[]       = []

        const res                               = { boxes, counter : 0 }

        for (let i = 0; i < this.depCount; i++) {
            boxes.push(this.graphGen.box(1))
        }

        for (let i = this.depCount; i < 2 * this.depCount; i++) {
            boxes.push(this.graphGen.computedGen(function* () : CalculationIterator<number> {
                res.counter++

                let sum = 0

                for (let i = 0; i < me.depCount; i++) {
                    sum     += (yield boxes[ i ].box) % 10000
                }

                return sum
            }, i))
        }

        for (let i = 2 * this.depCount; i < this.atomNum; i++) {
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

        for (let i = 0; i < this.depCount; i++) {
            const sum   = iteration + cycle

            // the sum of these boxes won't change
            boxes[ i ].WRITE(1 + (i % 2 === 0 ? sum : -sum))
        }

        this.graphGen.graph.commit()
    }
}


//---------------------------------------------------------------------------------------------------------------------
const runFor = async (atomNum : number = 1000, depCount : number = 2) => {
    if (depCount % 2 !== 0) throw new Error("depCount needs to be even number")

    const chronoGraph2WithGraph = ShallowChangesGenBenchmark.new({
        name        : `Shallow changes, generators, atoms: ${atomNum}, boxes: ${depCount} - ChronoGraph2 with graph, commit`,
        atomNum     : atomNum,
        depCount    : depCount,
        graphGen    : new ReactiveDataGeneratorChronoGraph2WithGraph()
    })

    const chronoGraph1 = ShallowChangesGenBenchmark.new({
        name        : `Shallow changes, generators, atoms: ${atomNum}, boxes: ${depCount} - ChronoGraph1`,
        atomNum     : atomNum,
        depCount    : depCount,
        graphGen    : new ReactiveDataGeneratorChronoGraph1()
    })

    const runInfoChronoGraph2WithGraph = await chronoGraph2WithGraph.measureTillMaxTime()
    const runInfoChronoGraph1 = await chronoGraph1.measureFixed(runInfoChronoGraph2WithGraph.cyclesCount, runInfoChronoGraph2WithGraph.samples.length)

    // if (
    //     // (runInfoChronoGraph2.info.result !== runInfoChronoGraph1.info.result)
    //     // ||
    //     (runInfoChronoGraph2.info.result !== runInfoChronoGraph2WithGraph.info.result)
    // ) throw new Error("Results in last box differ")
    //
    // if (
    //     // (runInfoChronoGraph2.info.totalCount !== runInfoChronoGraph1.info.totalCount)
    //     // ||
    //     (runInfoChronoGraph2.info.totalCount !== runInfoChronoGraph2WithGraph.info.totalCount)
    // ) throw new Error("Total number of calculations differ")
}


export const run = async () => {
    await runFor(100000, 20)
}

launchIfStandaloneProcess(run, 'shallow_changes_gen')
