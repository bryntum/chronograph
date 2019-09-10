import { ChronoGraph, MinimalChronoGraph } from "../../src/chrono/Graph.js"
import { CalculatedValueSync, Identifier } from "../../src/chrono/Identifier.js"
import { observable, computed } from "../../node_modules/mobx/lib/mobx.module.js"

declare const window : any
declare const performance : any

type GraphGenerationResult  = { graph : ChronoGraph, boxes : Identifier[] }

const iterationsCount : number      = 20
const repeatsPerIteration : number  = 200

export let count : number = 0

export const deepGraphGen = (atomNum : number = 1000) : GraphGenerationResult => {
    const graph : ChronoGraph   = MinimalChronoGraph.new()

    let boxes       = []

    for (let i = 0; i < atomNum; i++) {
        if (i <= 3) {
            boxes.push(graph.variableId(i, 1))
        }
        else if (i <= 10) {
            boxes.push(graph.identifierId(i, function* (YIELD) {
                count++

                const input : number[] = [
                    yield boxes[0],
                    yield boxes[1],
                    yield boxes[2],
                    yield boxes[3]
                ]

                return input.reduce((sum, op) => sum + op, 0)
            }, i))
        }
        else if (i % 2 == 0) {
            boxes.push(graph.identifierId(i, function* (YIELD) {
                count++

                const input : number[] = [
                    yield boxes[this - 1],
                    yield boxes[this - 2],
                    yield boxes[this - 3],
                    yield boxes[this - 4]
                ]

                return input.reduce((sum, op) => (sum + op) % 10000, 0)
            }, i))
        } else {
            boxes.push(graph.identifierId(i, function* (YIELD) {
                count++

                const input : number[] = [
                    yield boxes[this - 1],
                    yield boxes[this - 2],
                    yield boxes[this - 3],
                    yield boxes[this - 4]
                ]

                return input.reduce((sum, op) => (sum - op) % 10000, 0)
            }, i))
        }
    }

    return { graph, boxes }
}


export const deepGraphSync = (atomNum : number = 1000) : GraphGenerationResult => {
    const graph : ChronoGraph   = MinimalChronoGraph.new()

    let boxes       = []

    for (let i = 0; i < atomNum; i++) {
        if (i <= 3) {
            boxes.push(graph.variableId(i, 1))
        }
        else if (i <= 10) {
            boxes.push(graph.addIdentifier(CalculatedValueSync.new({
                calculation : function (YIELD) {
                    count++

                    const input : number[] = [
                        YIELD(boxes[0]),
                        YIELD(boxes[1]),
                        YIELD(boxes[2]),
                        YIELD(boxes[3])
                    ]

                    return input.reduce((sum, op) => sum + op, 0)
                },
                context : i
            })))
        }
        else if (i % 2 == 0) {
            boxes.push(graph.addIdentifier(CalculatedValueSync.new({
                calculation : function (YIELD) {
                    count++

                    const input : number[] = [
                        YIELD(boxes[this - 1]),
                        YIELD(boxes[this - 2]),
                        YIELD(boxes[this - 3]),
                        YIELD(boxes[this - 4])
                    ]

                    return input.reduce((sum, op) => (sum + op) % 10000, 0)
                },
                context : i
            })))
        } else {
            boxes.push(graph.addIdentifier(CalculatedValueSync.new({
                calculation : function (YIELD) {
                    count++

                    const input : number[] = [
                        YIELD(boxes[this - 1]),
                        YIELD(boxes[this - 2]),
                        YIELD(boxes[this - 3]),
                        YIELD(boxes[this - 4])
                    ]

                    return input.reduce((sum, op) => (sum - op) % 10000, 0)
                },
                context : i
            })))
        }
    }

    return { graph, boxes }
}


export const mobxGraph = (atomNum : number = 1000) => {
    let boxes       = []

    for (let i = 0; i < atomNum; i++) {
        if (i <= 3) {
            boxes.push(observable.box(1))
        }
        else if (i <= 10) {
            boxes.push(computed(function () {
                count++

                const input = [
                    boxes[0].get(),
                    boxes[1].get(),
                    boxes[2].get(),
                    boxes[3].get(),
                ]

                return input.reduce((sum, op) => sum + op, 0)
            }, { keepAlive : true, context : i }))
        }
        else if (i % 2 == 0) {
            boxes.push(computed(function () {
                count++

                const input = [
                    boxes[this - 1].get(),
                    boxes[this - 2].get(),
                    boxes[this - 3].get(),
                    boxes[this - 4].get(),
                ]

                return input.reduce((sum, op) => (sum + op) % 10000, 0)
            }, { keepAlive : true, context : i }))

        } else {
            boxes.push(computed(function () {
                count++

                const input = [
                    boxes[this - 1].get(),
                    boxes[this - 2].get(),
                    boxes[this - 3].get(),
                    boxes[this - 4].get(),
                ]

                return input.reduce((sum, op) => (sum - op) % 10000, 0)
            }, { keepAlive : true, context : i }))
        }
    }

    return boxes
}



export const benchmarkGraphPopulation = async (genFunction : (num : number) => GraphGenerationResult, atomNum : number = 500000) => {
    console.time("Build graph")
    // console.profile('Build graph')

    const { graph, boxes }  = genFunction(atomNum)

    window.graph    = graph

    // // console.profileEnd()
    console.timeEnd("Build graph")
}


export const benchmarkDeepChanges = async (genFunction : (num : number) => GraphGenerationResult, atomNum : number = 500000) => {
    console.time("Build graph")
    // console.profile('Build graph')

    const { graph, boxes }  = genFunction(atomNum)

    window.graph    = graph

    // // console.profileEnd()
    console.timeEnd("Build graph")

    //--------------------------
    console.time("Calculate")
    // console.profile('Propagate #1')

    const times = []

    for (let i = 0; i < iterationsCount; i++) {
        await new Promise(resolve => setTimeout(resolve, 10))

        const start     = performance.now()

        for (let j = 0; j < repeatsPerIteration; j++) {
            graph.write(boxes[ 0 ], j)

            graph.propagateSync()
        }

        times.push(performance.now() - start)
    }

    // console.profileEnd('Propagate #1')
    console.timeEnd("Calculate")

    console.log("Average iteration time: ", times.reduce((acc, current) => acc + current, 0) / times.length)

    console.log("Result: ", graph.read(boxes[ boxes.length - 1 ]))
    console.log("Total count: ", count)
}


export const benchmarkMobxDeepChanges = async (atomNum : number = 500000) => {
    console.time("Build graph")
    // console.profile('Build graph')

    const boxes = mobxGraph(atomNum)

    // // console.profileEnd()
    console.timeEnd("Build graph")

    //--------------------------
    console.time("Calculate")
    // console.profile('Propagate #1')

    const times = []

    for (let i = 0; i < iterationsCount; i++) {
        await new Promise(resolve => setTimeout(resolve, 10))

        const start     = performance.now()

        for (let j = 0; j < repeatsPerIteration; j++) {
            boxes[ 0 ].set(j)

            // seems mobx does not have concept of eager computation, need to manually read all atoms
            for (let k = 0; k < boxes.length; k++) boxes[ k ].get()
        }

        times.push(performance.now() - start)
    }

    // console.profileEnd('Propagate #1')
    console.timeEnd("Calculate")

    console.log("Average iteration time: ", times.reduce((acc, current) => acc + current, 0) / times.length)

    console.log("Result: ", boxes[ boxes.length - 1 ].get())
    console.log("Total count: ", count)
}


export const benchmarkMobxShallowChanges = async (atomNum : number = 500000) => {
    console.time("Build graph")
    // console.profile('Build graph')

    const boxes = mobxGraph(atomNum)

    // // console.profileEnd()
    console.timeEnd("Build graph")

    //--------------------------
    console.time("Calculate")
    // console.profile('Propagate #1')

    const times = []

    for (let i = 0; i < iterationsCount; i++) {
        await new Promise(resolve => setTimeout(resolve, 10))

        const start     = performance.now()

        for (let j = 0; j < repeatsPerIteration; j++) {
            boxes[0].set(j)
            boxes[1].set(15 - j)

            // seems mobx does not have concept of eager computation, need to manually read all atoms
            for (let k = 0; k < boxes.length; k++) boxes[ k ].get()
        }

        times.push(performance.now() - start)
    }

    // console.profileEnd('Propagate #1')
    console.timeEnd("Calculate")

    console.log("Average iteration time: ", times.reduce((acc, current) => acc + current, 0) / times.length)

    console.log("Result: ", boxes[ boxes.length - 1 ].get())
    console.log("Total count: ", count)
}


export const benchmarkShallowChanges = async (genFunction : (num : number) => GraphGenerationResult, atomNum : number = 500000) => {
    console.time("Build graph")
    // console.profile('Build graph')

    const { graph, boxes }  = genFunction(atomNum)

    window.graph    = graph

    // // console.profileEnd()
    console.timeEnd("Build graph")

    //--------------------------
    console.time("Calculate")
    // console.profile('Propagate #1')

    const times = []

    for (let i = 0; i < iterationsCount; i++) {
        await new Promise(resolve => setTimeout(resolve, 10))

        const start     = performance.now()

        for (let j = 0; j < repeatsPerIteration; j++) {
            graph.write(boxes[ 0 ], j)
            graph.write(boxes[ 1 ], 15 - j)

            graph.propagate()
        }

        times.push(performance.now() - start)
    }


    // console.profileEnd('Propagate #1')
    console.timeEnd("Calculate")

    console.log("Average iteration time: ", times.reduce((acc, current) => acc + current, 0) / times.length)

    console.log("Result: ", graph.read(boxes[ boxes.length - 1 ]))
    console.log("Total count: ", count)
}
