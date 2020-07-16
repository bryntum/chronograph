import { Benchmark } from "../../../src/benchmark/Benchmark.js"
import { ReactiveDataGeneratorChronoGraph1, ReactiveDataGeneratorChronoGraph2WithGraph } from "../graphful/data_generators.js"
import { ReactiveDataGenerator, reactiveDataGeneratorChronoGraph2, reactiveDataGeneratorMobx, launchIfStandaloneProcess } from "./data_generators.js"


//---------------------------------------------------------------------------------------------------------------------
export class AllocationBenchmark extends Benchmark<void, void> {
    atomNum         : number                        = 1000
    depCount        : number                        = 1

    graphGen        : ReactiveDataGenerator<unknown>       = undefined


    cycle (iteration : number, cycle : number, state : void) {
        let boxes : any[]                       = []

        for (let i = 0; i < this.depCount; i++) {
            boxes.push(this.graphGen.rawBox(0))
        }

        for (let i = this.depCount; i < this.atomNum; i++) {
            boxes.push(this.graphGen.rawComputed(function () { return 1 }, i))
        }

        return boxes
    }
}


//---------------------------------------------------------------------------------------------------------------------
const runFor = async (atomNum : number = 100000, depCount : number = 1) => {
    const chronoGraph2 = AllocationBenchmark.new({
        name        : `Data allocation, boxes: ${depCount}, computeds: ${atomNum - depCount} - ChronoGraph2`,
        atomNum     : atomNum,
        depCount    : depCount,
        graphGen    : reactiveDataGeneratorChronoGraph2
    })

    const mobx = AllocationBenchmark.new({
        name        : `Data allocation, boxes: ${depCount}, computeds: ${atomNum - depCount} - Mobx`,
        atomNum     : atomNum,
        depCount    : depCount,
        graphGen    : reactiveDataGeneratorMobx
    })

    const chronoGraph2WithGraph = AllocationBenchmark.new({
        name        : `Data allocation, boxes: ${depCount}, computeds: ${atomNum - depCount} - ChronoGraph2 with graph`,
        atomNum     : atomNum,
        depCount    : depCount,
        graphGen    : new ReactiveDataGeneratorChronoGraph2WithGraph()
    })

    const chronoGraph1 = AllocationBenchmark.new({
        name        : `Data allocation, boxes: ${depCount}, computeds: ${atomNum - depCount} - ChronoGraph1`,
        atomNum     : atomNum,
        depCount    : depCount,
        graphGen    : new ReactiveDataGeneratorChronoGraph1()
    })

    await chronoGraph2.measureTillMaxTime()
    await mobx.measureTillMaxTime()
    await chronoGraph2WithGraph.measureTillMaxTime()
    await chronoGraph1.measureTillMaxTime()
}


export const run = async () => {
    await runFor(100000, 1)
    await runFor(100000, 50000)
    await runFor(100000, 99999)
}

launchIfStandaloneProcess(run, 'allocation')
