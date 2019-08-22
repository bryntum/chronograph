import { ChronoGraph, MinimalChronoGraph } from "../../src/chrono/Graph.js"
import { CalculatedValueSync } from "../../src/primitives/Identifier.js"

declare const window : any

const bench1 = () => {
    const graph : ChronoGraph   = window.graph = MinimalChronoGraph.new()

    // should not use too big value, because otherwise, the benchmark
    // becomes memory-bound and we want to measure CPU consumption
    let atomNum     = 1400

    let boxes       = []

    console.time("Build graph")
    // console.profile('Build graph')

    for (let i = 0; i < atomNum; i++) {
        if (i <= 3) {
            boxes.push(graph.variableId(i, 1))
        }
        else if (i <= 10) {
            boxes.push(graph.addIdentifier(CalculatedValueSync.new({
                calculation : function (context) {
                    const input = [
                        context.read(boxes[0]),
                        context.read(boxes[1]),
                        context.read(boxes[2]),
                        context.read(boxes[3])
                    ]

                    return input.reduce((sum, op) => sum + op, 0)
                },
                calculationContext : i
            })))
        }
        else if (i % 2 == 0) {
            boxes.push(graph.addIdentifier(CalculatedValueSync.new({
                calculation : function (context) {
                    const input = [
                        context.read(boxes[this - 1]),
                        context.read(boxes[this - 2]),
                        context.read(boxes[this - 3]),
                        context.read(boxes[this - 4])
                    ]

                    return input.reduce((sum, op) => (sum + op) % 10000, 0)
                },
                calculationContext : i
            })))
        } else {
            boxes.push(graph.addIdentifier(CalculatedValueSync.new({
                calculation : function (context) {
                    const input = [
                        context.read(boxes[this - 1]),
                        context.read(boxes[this - 2]),
                        context.read(boxes[this - 3]),
                        context.read(boxes[this - 4])
                    ]

                    return input.reduce((sum, op) => (sum - op) % 10000, 0)
                },
                calculationContext : i
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
    console.time("Calc #1")
    // console.profile('Propagate #1')

    for (let i = 0; i < 1000; i++) {
        graph.write(boxes[ 0 ], i)
        // graph.write(boxes[ 1 ], 2) // only few atoms changes

        graph.propagate()
    }

    // console.profileEnd('Propagate #1')
    console.timeEnd("Calc #1")

    console.log("Result #1: ", graph.read(boxes[ boxes.length - 1 ]))


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
