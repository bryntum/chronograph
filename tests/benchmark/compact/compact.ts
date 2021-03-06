import { BenchmarkC } from "../../../src/benchmark/Benchmark.js"
import { MIN_SMI } from "../../../src/util/Helpers.js"
import { compact, Uniqable } from "../../../src/util/Uniqable.js"


const toCompact : number    = 10000

type CompactBenchState = {
    array       : Uniqable[][]
}

const getUniqable   = () => { return { uniqable : MIN_SMI } }

const el1   = getUniqable()
const el2   = getUniqable()
const el3   = getUniqable()

const elements : Uniqable[]     = [ el1, el2, el1, el3, el1, el2, el3, el1, el2, el1, el3, el1, el2, el3, el1, el2, el1, el3, el1, el2, el3, ]

const compactees = Array(toCompact).fill(null).map(() => elements)

//---------------------------------------------------------------------------------------------------------------------
const compactInPlaceBenchmark = BenchmarkC<CompactBenchState>({
    name : `Compact in place ${toCompact}`,

    async setup () : Promise<CompactBenchState> {
        return {
            array : compactees
        }
    },

    cycle (iteration : number, cycle : number, setup : CompactBenchState) {
        const { array } = setup

        const compacted = []

        for (let i = 0; i < array.length; i++) {
            const arrayToCompact    = array[ i ].slice()

            compacted.push(compact(arrayToCompact))
        }
    }
})


//---------------------------------------------------------------------------------------------------------------------
const compactImmutableBenchmark = BenchmarkC<CompactBenchState>({
    name : `Compact immutable ${toCompact}`,

    async setup () : Promise<CompactBenchState> {
        return {
            array : compactees
        }
    },

    cycle (iteration : number, cycle : number, setup : CompactBenchState) {
        const { array } = setup

        const compacted = []

        for (let i = 0; i < array.length; i++) {
            const arrayToCompact    = array[ i ].slice()

            compacted.push(Array.from(new Set(arrayToCompact)))
        }
    }
})

const runAll = async () => {
    await compactInPlaceBenchmark.measureTillMaxTime()
    await compactImmutableBenchmark.measureTillMaxTime()
}


runAll()
