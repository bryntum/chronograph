import { ChronoAtom, MinimalChronoAtom } from "../../src/chrono/Atom.js";
import { ChronoGraph, MinimalChronoGraph } from "../../src/chrono/Graph.js";

declare const StartTest : any

StartTest(t => {

    t.it("Should be performant", async t => {
        const graph : ChronoGraph   = MinimalChronoGraph.new()

        let atomNum     = 50000

        let boxes       = []

        console.time("Build graph")
        // console.profile('Build graph')

        for (let i = 0; i < atomNum; i++) {
            const atomConfig : Partial<ChronoAtom>   = { id : i, value : i > 3 ? undefined : 1 }

            if (i > 3) {
                if (i % 2 == 0) {

                    atomConfig.calculation = function * () {
                        // console.log(`Calculating ${this.id}`)

                        const input = [
                            yield boxes[ this.id - 1 ],
                            yield boxes[ this.id - 2 ],
                            yield boxes[ this.id - 3 ],
                            yield boxes[ this.id - 4 ]
                        ]

                        return input.reduce((sum, op) => (sum + op) % 10000, 0)
                    }
                }
                else {
                    atomConfig.calculation = function * () {
                        // console.log(`Calculating ${this.id}`)

                        const input = [
                            yield boxes[ this.id - 1 ],
                            yield boxes[ this.id - 2 ],
                            yield boxes[ this.id - 3 ],
                            yield boxes[ this.id - 4 ]
                        ]

                        return input.reduce((sum, op) => (sum - op) % 10000, 0)
                    }
                }
            }

            const box       = MinimalChronoAtom.new(atomConfig)

            boxes.push(box)

            graph.addNode(box)
        }

        // console.profileEnd()
        console.timeEnd("Build graph")

        console.time("Calc #0")

        await graph.propagate()

        console.timeEnd("Calc #0");

        t.chain(
            async next => {
                boxes[ 0 ].put(0)

                console.time("Calc #1")
                // console.profile('Propagate')

                await graph.propagate()

                // console.profileEnd()
                console.timeEnd("Calc #1");

                console.log("Result: ", boxes[ boxes.length - 1 ].get())
            },
            async next => {
                boxes[ 49500 ].put(0)

                console.time("Calc #2");

                await graph.propagate()

                console.timeEnd("Calc #2");

                console.log("Result: ", boxes[ boxes.length - 1 ].get())
            }
        )
    });
});
