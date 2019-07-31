import { ChronoGraph, MinimalChronoGraph } from "../../src/chrono/Graph.js"

declare const StartTest : any

StartTest(t => {

    t.it("Should be performant", async t => {
        await new Promise(resolve => setTimeout(resolve, 1))

        const graph : ChronoGraph   = MinimalChronoGraph.new()

        // should not use too big value, because otherwise, the benchmark
        // becomes memory-bound and we want to measure CPU consumption
        let atomNum     = 500000

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

        // console.profileEnd()
        console.timeEnd("Build graph")

        console.time("Calc #0")
        // console.profile('Propagate #0')

        graph.propagate()

        // console.profileEnd()
        console.timeEnd("Calc #0")

        console.log("Result #0: ", graph.read(boxes[ boxes.length - 1 ]))

        t.chain(
            async next => {
                console.time("Calc #1")
                // console.profile('Propagate #1')

                graph.write(boxes[ 0 ], 0)
                // graph.write(boxes[ 1 ], 2) // only few atoms changes

                graph.propagate()

                // console.profileEnd()
                console.timeEnd("Calc #1")

                console.log("Result #1: ", graph.read(boxes[ boxes.length - 1 ]))
            },
            async next => {
                console.time("Undo")
                // console.profile('Undo')

                graph.undo()

                // console.profileEnd()
                console.timeEnd("Undo")

                console.log("Result after undo: ", graph.read(boxes[ boxes.length - 1 ]))
            }
        )
    })


    t.xit("Plain js version", async t => {
        let atomNum     = 300000

        let boxes       = []

        console.time("Build graph")

        for (let i = 0; i < atomNum; i++) {
            if (i <= 3) {
                boxes.push({ value : 1 })
            }
            else if (i <= 10) {
                boxes.push({
                    index       : i,

                    calculation : function () {
                        const input = [
                            boxes[0].value,
                            boxes[1].value,
                            boxes[2].value,
                            boxes[3].value,
                        ]

                        this.value = input.reduce((sum, op) => sum + op, 0)
                    }
                })
            }
            else if (i % 2 == 0) {
                boxes.push({
                    index       : i,

                    calculation : function () {
                        const input = [
                            boxes[this.index - 1].value,
                            boxes[this.index - 2].value,
                            boxes[this.index - 3].value,
                            boxes[this.index - 4].value
                        ]

                        this.value = input.reduce((sum, op) => (sum + op) % 10000, 0)
                    }
                })
            } else {
                boxes.push({
                    index       : i,

                    calculation : function () {
                        const input = [
                            boxes[this.index - 1].value,
                            boxes[this.index - 2].value,
                            boxes[this.index - 3].value,
                            boxes[this.index - 4].value
                        ]

                        this.value = input.reduce((sum, op) => (sum - op) % 10000, 0)
                    }
                })
            }
        }

        // console.profileEnd()
        console.timeEnd("Build graph")

        console.time("Calc #0")
        // console.profile('Propagate #0')

        boxes.forEach(atom => atom.calculation ? atom.calculation() : null)

        // console.profileEnd()
        console.timeEnd("Calc #0")

        console.log("Result #0: ", boxes[ boxes.length - 1 ].value)

        // t.chain(
        //     async next => {
        //         graph.write(boxes[ 0 ], 0)
        //         // graph.write(boxes[ 1 ], 2)
        //
        //         console.time("Calc #1")
        //         // console.profile('Propagate #1')
        //
        //         graph.propagate()
        //
        //         // console.profileEnd()
        //         console.timeEnd("Calc #1")
        //
        //         console.log("Result #1: ", graph.read(boxes[ boxes.length - 1 ]))
        //     },
        //     async next => {
        //         console.time("Undo")
        //         console.profile('Undo')
        //
        //         graph.undo()
        //
        //         console.profileEnd()
        //         console.timeEnd("Undo")
        //
        //         console.log("Result after undo: ", graph.read(boxes[ boxes.length - 1 ]))
        //     }
        // )
    })

})
