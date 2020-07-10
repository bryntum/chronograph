import { GraphGenerationResult, graphGeneratorChronoGraph2, graphGeneratorMobx, launchIfStandaloneProcess } from "./data_generators.js"
import { StableGraphBenchmark } from "./stable_graph.js"


//---------------------------------------------------------------------------------------------------------------------
export class ShallowChangesBenchmark extends StableGraphBenchmark {

    cycle (iteration : number, cycle : number, state : GraphGenerationResult) {
        const { boxes } = state

        // the sum of these 2 boxes won't change
        boxes[ 0 ].WRITE(1 + iteration + cycle)
        boxes[ 1 ].WRITE(1 - (iteration + cycle))

        for (let k = 0; k < boxes.length; k++) boxes[ k ].READ()
    }
}


//---------------------------------------------------------------------------------------------------------------------
const runFor = async (atomNum : number = 1000, depCount : number = 2) => {
    const stableGraphChronoGraph2 = StableGraphBenchmark.new({
        name        : `Shallow changes, atoms: ${atomNum}, boxes: ${depCount} - ChronoGraph2`,
        atomNum     : atomNum,
        depCount    : depCount,
        graphGen    : graphGeneratorChronoGraph2
    })

    const stableGraphMobx = StableGraphBenchmark.new({
        name        : `Shallow changes, atoms: ${atomNum}, boxes: ${depCount} - Mobx`,
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
    await runFor(1000, 2)
}

launchIfStandaloneProcess(run, 'shallow_changes')
