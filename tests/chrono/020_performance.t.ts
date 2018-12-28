import {ChronoAtom, MinimalChronoAtom} from "../../src/chrono/Atom.js";
import {ChronoGraph, MinimalChronoGraph} from "../../src/chrono/Graph.js";

declare const StartTest : any

StartTest(t => {

    t.it("Should be performant", t => {
        const graph : ChronoGraph   = MinimalChronoGraph.new()

        let atomNum     = 50000

        let boxes       = []

        console.time("Build graph")
        // console.profile('Build graph')

        for (let i = 0; i < atomNum; ++i) {
            const atomConfig : Partial<ChronoAtom>   = { id : i, value : i > 3 ? undefined : 1 }

            if (i > 3) {
                if (i % 2 == 0) {

                    atomConfig.calculation = function () {
                        const input = [
                            boxes[ this.id - 1 ].get(),
                            boxes[ this.id - 2 ].get(),
                            boxes[ this.id - 3 ].get(),
                            boxes[ this.id - 4 ].get()
                        ]

                        return input.reduce((sum, op) => (sum + op) % 10000, 0)
                    }
                }
                else {
                    atomConfig.calculation = function () {
                        const input = [
                            boxes[ this.id - 1 ].get(),
                            boxes[ this.id - 2 ].get(),
                            boxes[ this.id - 3 ].get(),
                            boxes[ this.id - 4 ].get()
                        ]

                        return input.reduce((sum, op) => (sum - op) % 10000, 0)
                    }
                }
            }

            const box       = MinimalChronoAtom.new(atomConfig)

            boxes.push(box)

            graph.addNode(box)
        }

        graph.propagate()

        // console.profileEnd()
        console.timeEnd("Build graph")

        t.chain(
            next => {
                boxes[ 0 ].set(0)

                console.time("Calc #1")
                // console.profile('Propagate')

                graph.propagate()

                // console.profileEnd()
                console.timeEnd("Calc #1");

                console.log("Result: ", boxes[ boxes.length - 1 ].get())

                next()
            },
            next => {
                // boxes[ 49500 ].set(0)
                //
                // console.time("Calc #2");
                //
                // graph.propagate()
                //
                // console.timeEnd("Calc #2");
                //
                // console.log("Result: ", boxes[ boxes.length - 1 ].get())
            }
        )
    });
});
