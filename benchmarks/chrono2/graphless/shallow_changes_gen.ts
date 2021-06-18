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
export class ShallowChangesGenBenchmark extends ReactiveDataBenchmark {
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
            boxes.push(this.graphGen.computedGen(function* (this : number) : CalculationIterator<number> {
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

        for (let k = boxes.length - 1; k >= 0; k--) boxes[ k ].READ()
    }
}


//---------------------------------------------------------------------------------------------------------------------
const runFor = async (atomNum : number = 1000, depCount : number = 2) => {
    if (depCount % 2 !== 0) throw new Error("depCount needs to be even number")

    const chronoGraph2 = ShallowChangesGenBenchmark.new({
        name        : `Shallow changes, generators, atoms: ${atomNum}, boxes: ${depCount} - ChronoGraph2`,
        atomNum     : atomNum,
        depCount    : depCount,
        graphGen    : reactiveDataGeneratorChronoGraph2
    })

    const chronoGraph2WithGraph = ShallowChangesGenBenchmark.new({
        name        : `Shallow changes, generators, atoms: ${atomNum}, boxes: ${depCount} - ChronoGraph2 with graph`,
        atomNum     : atomNum,
        depCount    : depCount,
        graphGen    : new ReactiveDataGeneratorChronoGraph2WithGraph()
    })

    // const chronoGraph1 = ShallowChangesGenBenchmark.new({
    //     name        : `Shallow changes, generators, atoms: ${atomNum}, boxes: ${depCount} - ChronoGraph1`,
    //     atomNum     : atomNum,
    //     depCount    : depCount,
    //     graphGen    : new ReactiveDataGeneratorChronoGraph1()
    // })

    const runInfoChronoGraph2   = await chronoGraph2.measureTillMaxTime()
    const runInfoChronoGraph2WithGraph = await chronoGraph2WithGraph.measureFixed(
        runInfoChronoGraph2.cyclesCount, runInfoChronoGraph2.samples.length
    )
    // const runInfoChronoGraph1 = await chronoGraph1.measureFixed(runInfoChronoGraph2.cyclesCount, runInfoChronoGraph2.samples.length)

    if (
        // (runInfoChronoGraph2.info.result !== runInfoChronoGraph1.info.result)
        // ||
        (runInfoChronoGraph2.info.result !== runInfoChronoGraph2WithGraph.info.result)
    ) throw new Error("Results in last box differ")

    if (
        // (runInfoChronoGraph2.info.totalCount !== runInfoChronoGraph1.info.totalCount)
        // ||
        (runInfoChronoGraph2.info.totalCount !== runInfoChronoGraph2WithGraph.info.totalCount)
    ) throw new Error("Total number of calculations differ")
}


export const run = async () => {
    await runFor(100000, 4)
}

launchIfStandaloneProcess(run, 'shallow_changes_gen')
