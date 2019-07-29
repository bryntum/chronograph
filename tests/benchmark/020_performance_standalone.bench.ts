import { ChronoGraph, MinimalChronoGraph } from "../../src/chrono/Graph.js"

declare const window : any

const bench1 = () => {
    const graph : ChronoGraph   = window.graph = MinimalChronoGraph.new()

    // should not use too big value, because otherwise, the benchmark
    // becomes memory-bound and we want to measure CPU consumption
    let atomNum     = 100000

    let boxes       = []

    console.time("Build graph")
    // console.profile('Build graph')

    for (let i = 0; i < atomNum; i++) {
        if (i <= 3) {
            boxes.push(graph.variableId(i, 1))
        }
        else if (i <= 10) {
            boxes.push(graph.identifierId(i, function* () {
                const input = [
                    yield boxes[0],
                    yield boxes[1],
                    yield boxes[2],
                    yield boxes[3]
                ]

                return input.reduce((sum, op) => sum + op, 0)
            }, i))
        }
        else if (i % 2 == 0) {
            boxes.push(graph.identifierId(i, function* () {
                const input = [
                    yield boxes[this - 1],
                    yield boxes[this - 2],
                    yield boxes[this - 3],
                    yield boxes[this - 4]
                ]

                return input.reduce((sum, op) => (sum + op) % 10000, 0)
            }, i))
        } else {
            boxes.push(graph.identifierId(i, function* () {
                const input = [
                    yield boxes[this - 1],
                    yield boxes[this - 2],
                    yield boxes[this - 3],
                    yield boxes[this - 4]
                ]

                return input.reduce((sum, op) => (sum - op) % 10000, 0)
            }, i))
        }
    }

    // // console.profileEnd()
    console.timeEnd("Build graph")

    console.time("Calc #0")
    // console.profile('Propagate #0')

    graph.propagate()

    // console.profileEnd()
    console.timeEnd("Calc #0")

    console.log("Result #0: ", graph.read(boxes[ boxes.length - 1 ]))


    graph.write(boxes[ 0 ], 0)
    // graph.write(boxes[ 1 ], 2) // only few atoms changes

    console.time("Calc #1")
    // console.profile('Propagate #1')

    graph.propagate()

    // console.profileEnd()
    console.timeEnd("Calc #1")

    console.log("Result #1: ", graph.read(boxes[ boxes.length - 1 ]))


    // graph.write(boxes[ 10 ], 10)
    // // graph.write(boxes[ 1 ], 2) // only few atoms changes
    //
    // console.time("Calc #2")
    // // console.profile('Propagate #1')
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
