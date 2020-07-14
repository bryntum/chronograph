import { GraphfulGeneratorChronoGraph1, GraphfulGeneratorChronoGraph2 } from "../graphful/data_generators.js"
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
export class ShallowChangesBenchmark extends GraphlessBenchmark {
    atomNum         : number                        = 1000
    depCount        : number                        = 1

    graphGen        : GraphGenerator<unknown>       = undefined

    async setup () {
        const me                                = this

        let boxes : BoxAbstract<number>[]       = []

        const res                               = { boxes, counter : 0 }

        for (let i = 0; i < this.depCount; i++) {
            boxes.push(this.graphGen.box(1))
        }

        for (let i = this.depCount; i < 2 * this.depCount; i++) {
            boxes.push(this.graphGen.computed(function () {
                res.counter++

                let sum = 0

                for (let i = 0; i < me.depCount; i++) {
                    sum     += boxes[ i ].READ() % 10000
                }

                return sum
            }, i))
        }

        for (let i = 2 * this.depCount; i < this.atomNum; i++) {
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

    cycle (iteration : number, cycle : number, state : GraphGenerationResult) {
        const { boxes } = state

        for (let i = 0; i < this.depCount; i++) {
            const sum   = iteration + cycle

            // the sum of these boxes won't change
            boxes[ i ].WRITE(1 + (i % 2 === 0 ? sum : -sum))
        }

        for (let k = 0; k < boxes.length; k++) boxes[ k ].READ()
    }
}


//---------------------------------------------------------------------------------------------------------------------
const runFor = async (atomNum : number = 1000, depCount : number = 2) => {
    if (depCount % 2 !== 0) throw new Error("depCount needs to be even number")

    const chronoGraph2 = ShallowChangesBenchmark.new({
        name        : `Shallow changes, atoms: ${atomNum}, boxes: ${depCount} - ChronoGraph2`,
        atomNum     : atomNum,
        depCount    : depCount,
        graphGen    : graphGeneratorChronoGraph2
    })

    const mobx = ShallowChangesBenchmark.new({
        name        : `Shallow changes, atoms: ${atomNum}, boxes: ${depCount} - Mobx`,
        atomNum     : atomNum,
        depCount    : depCount,
        graphGen    : graphGeneratorMobx
    })

    const chronoGraph2WithGraph = ShallowChangesBenchmark.new({
        name        : `Shallow changes, atoms: ${atomNum}, boxes: ${depCount} - ChronoGraph2 with graph`,
        atomNum     : atomNum,
        depCount    : depCount,
        graphGen    : new GraphfulGeneratorChronoGraph2()
    })

    const chronoGraph1 = ShallowChangesBenchmark.new({
        name        : `Shallow changes, atoms: ${atomNum}, boxes: ${depCount} - ChronoGraph1`,
        atomNum     : atomNum,
        depCount    : depCount,
        graphGen    : new GraphfulGeneratorChronoGraph1()
    })

    const runInfoChronoGraph2   = await chronoGraph2.measureTillMaxTime()
    const runInfoMobx           = await mobx.measureFixed(runInfoChronoGraph2.cyclesCount, runInfoChronoGraph2.samples.length)
    const runInfoChronoGraph2WithGraph = await chronoGraph2WithGraph.measureFixed(runInfoChronoGraph2.cyclesCount, runInfoChronoGraph2.samples.length)
    const runInfoChronoGraph1 = await chronoGraph1.measureFixed(runInfoChronoGraph2.cyclesCount, runInfoChronoGraph2.samples.length)

    if (runInfoMobx.info.result !== runInfoChronoGraph2.info.result) throw new Error("Results in last box differ")
    if (runInfoMobx.info.totalCount !== runInfoChronoGraph2.info.totalCount) throw new Error("Total number of calculations differ")
}


export const run = async () => {
    await runFor(1000, 20)
}

launchIfStandaloneProcess(run, 'shallow_changes')
