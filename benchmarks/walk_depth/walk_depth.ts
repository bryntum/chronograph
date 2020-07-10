import { Benchmark } from "../../src/benchmark/Benchmark.js"
import {
    WalkDepthNoCyclesNoVisitStateExternalStack,
    WalkDepthNoCyclesNoVisitStateRecursive
} from "../../src/collection/walk_depth/WalkDepthopedia.js"
import { deepGraphGen, GraphGenerationResult, Node } from "./data.js"


//---------------------------------------------------------------------------------------------------------------------
export const walkDepthNoCyclesNoVisitStateRecursive = Benchmark.new({
    name        : 'Walk depth no cycles, recursive',

    setup       : async () : Promise<GraphGenerationResult> => {
        return deepGraphGen(1300, 4)
    },

    cycle       : (iteration : number, cycle : number, setup : GraphGenerationResult) => {
        let total : number = 0

        const walkDepthContext = WalkDepthNoCyclesNoVisitStateRecursive.new({
            next : (node : Node) => node.outgoing,

            onVisit : (node : Node) => total += node.count
        })

        walkDepthContext.walkDepth(setup.nodes[ 0 ])

        // console.log("Total: ", total)
    }
})


//---------------------------------------------------------------------------------------------------------------------
export const walkDepthNoCyclesNoVisitStateExternalStack = Benchmark.new({
    name        : 'Walk depth no cycles, external stack',

    setup       : async () : Promise<GraphGenerationResult> => {
        return deepGraphGen(1300, 4)
    },

    cycle       : (iteration : number, cycle : number, setup : GraphGenerationResult) => {
        let total : number = 0

        const walkDepthContext = WalkDepthNoCyclesNoVisitStateExternalStack.new({
            next : (node : Node) => node.outgoing,

            onVisit : (node : Node) => total += node.count
        })

        walkDepthContext.walkDepth(setup.nodes[ 0 ])

        // console.log("Total: ", total)
    }
})



//---------------------------------------------------------------------------------------------------------------------
export const runAllWalkDepth = async () => {
    await walkDepthNoCyclesNoVisitStateRecursive.measureTillRelativeMoe()
    await walkDepthNoCyclesNoVisitStateExternalStack.measureTillRelativeMoe()
}

runAllWalkDepth()
