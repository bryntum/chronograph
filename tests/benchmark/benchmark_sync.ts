import { ChronoGraph, MinimalChronoGraph } from "../../src/chrono/Graph.js"
import { CalculatedValueSync } from "../../src/chrono/Identifier.js"

declare const window : any
declare const performance : any

const bench1 = async () => {
    const graph : ChronoGraph   = window.graph = MinimalChronoGraph.new()

    // should not use too big value, because otherwise, the benchmark
    // becomes memory-bound and we want to measure CPU consumption
    let atomNum     = 1300

    let boxes       = []

    let count       = 0

    console.time("Build graph")
    // console.profile('Build graph')

    for (let i = 0; i < atomNum; i++) {
        if (i <= 3) {
            boxes.push(graph.variableId(i, 1))
        }
        else if (i <= 10) {
            boxes.push(graph.addIdentifier(CalculatedValueSync.new({
                calculation : function (YIELD) {
                    count++

                    const input = [
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

                    const input = [
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

                    const input = [
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

    // // console.profileEnd()
    console.timeEnd("Build graph")

    //--------------------------
    console.time("Calc #0")
    // console.profile('Propagate #0')

    graph.propagate()

    // console.profileEnd('Propagate #0')
    console.timeEnd("Calc #0")

    console.log("Result #0: ", graph.read(boxes[ boxes.length - 1 ]))


    //--------------------------
    // console.time("Calc #1")
    // console.profile('Propagate #1')


    const times = []

    for (let i = 0; i < 20; i++) {
        await new Promise(resolve => setTimeout(resolve, 10))

        const start     = performance.now()

        for (let i = 0; i < 200; i++) {
            graph.write(boxes[ 0 ], i)
            // graph.write(boxes[ 1 ], 2) // only few atoms changes

            graph.propagate()
        }

        times.push(performance.now() - start)
    }


    // console.profileEnd('Propagate #1')
    // console.timeEnd("Calc #1")

    console.log("Time #1: ", times.reduce((acc, current) => acc + current, 0) / times.length)

    console.log("Result #1: ", graph.read(boxes[ boxes.length - 1 ]))

    console.log("Total count: ", count)


    // //--------------------------
    // console.time("Calc #2")
    // // console.profile('Propagate #1')
    //
    // graph.write(boxes[ 10 ], 10)
    // // graph.write(boxes[ 1 ], 2) // only few atoms changes
    //
    // graph.propagate()
    //
    // // console.profileEnd()
    // console.timeEnd("Calc #2")
    //
    // console.log("Result #2: ", graph.read(boxes[ boxes.length - 1 ]))


    // console.time("Undo")
    // // console.profile('Undo')
    //
    // graph.undo()
    //
    // // console.profileEnd()
    // console.timeEnd("Undo")
    //
    // console.log("Result after undo: ", graph.read(boxes[ boxes.length - 1 ]))
}

bench1()
