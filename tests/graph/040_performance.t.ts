import {MinimalBox} from "../../src/chronograph/Box.js";
import {GraphBox, MinimalGraphBox} from "../../src/chronograph/Graph.js";
import {MinimalChronoMutationNode} from "../../src/chronograph/Mutation.js";

declare const StartTest : any

StartTest(t => {

    t.it("Should be performant", t => {
        const graph : GraphBox  = MinimalGraphBox.new()

        let atomNum     = 50000

        let boxes       = []
        let mutations   = []

        console.time("Build graph")
        // console.profile('Build graph')

        for (let i = 0; i < atomNum; ++i) {
            const box       = graph.addBox(MinimalBox.new({ value$ : 1 }))

            boxes.push(box)

            if (i > 3) {
                const inputs        = [
                    boxes[ i - 1 ],
                    boxes[ i - 2 ],
                    boxes[ i - 3 ],
                    boxes[ i - 4 ]
                ]

                const outputs       = [ box ]

                if (i % 2 == 0) {

                    graph.addMutation(
                        mutations[ i ] = MinimalChronoMutationNode.new({
                            input       : inputs,
                            output      : outputs,

                            calculation : (a1, a2, a3, a4) => {
                                return [ a1, a2, a3, a4 ].reduce((sum, op) => (sum + op) % 10000, 0)
                            }
                        })
                    )
                }
                else {
                    graph.addMutation(
                        mutations[ i ] = MinimalChronoMutationNode.new({
                            input       : inputs,
                            output      : outputs,

                            calculation : (a1, a2, a3, a4) => {
                                return [ a1, a2, a3, a4 ].reduce((sum, op) => (sum - op) % 10000, 0)
                            }
                        })
                    )
                }
            }
        }

        // console.profileEnd('Build graph')
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
                boxes[ 10000 ].set(0)

                mutations.forEach(mutation => mutation && graph.addMutation(mutation))

                console.time("Calc #2");

                graph.propagate()

                console.timeEnd("Calc #2");

                console.log("Result: ", boxes[ boxes.length - 1 ].get())
            }
        )
    });
});
