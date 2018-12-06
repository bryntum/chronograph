import {Box, MinimalBox} from "../../src/chronograph/Box.js";
import {GraphBox, MinimalGraphBox} from "../../src/chronograph/Graph.js";
import {MinimalChronoMutationNode} from "../../src/chronograph/Mutation.js";

declare const StartTest : any

StartTest(t => {


    t.it('Minimal mutation in graph context', t => {
        const graph : GraphBox  = MinimalGraphBox.new()

        const box1 : Box        = graph.addBox(MinimalBox.new({ id : 1 }))
        const box2 : Box        = graph.getBox(2)
        const box3 : Box        = graph.getBox(3)

        const mutation = MinimalChronoMutationNode.new({
            input       : [ box1, box2 ],

            output      : [ box3 ],

            calculation : (v1, v2) => v1 + v2
        })

        graph.addMutation(mutation)

        box1.set(0)
        box2.set(1)

        graph.propagate()

        t.is(box3.get(), 1, "Correct result calculated")

        box1.set(1)

        graph.addMutation(mutation)

        graph.propagate()

        t.is(box3.get(), 2, "Correct result calculated")
        t.is(box3.getPrevious().get(), 1, "Can track old value")

        box2.set(2)

        graph.addMutation(mutation)

        graph.propagate()

        t.is(box3.get(), 3, "Correct result calculated")
        t.is(box3.getPrevious().get(), 2, "Can track old value")
    })


    t.iit('2 mutations in graph context', t => {
        const graph : GraphBox  = MinimalGraphBox.new({ id : 'graph' })

        const box1 : Box        = graph.getBox('inp1')
        const box2 : Box        = graph.getBox('inp2')
        const box1p2 : Box      = graph.getBox('1p2')
        const box3 : Box        = graph.getBox('inp1')
        const res : Box         = graph.getBox('res')

        const mutation1 = MinimalChronoMutationNode.new({
            id          : 'mutation1',

            input       : [ box1, box2 ],
            output      : [ box1p2 ],

            calculation : (v1, v2) => {
                return v1 + v2
            }
        })

        const mutation2 = MinimalChronoMutationNode.new({
            id          : 'mutation2',

            input       : [ box1p2, box3 ],
            output      : [ res ],

            calculation : (v1, v2) => {
                // debugger
                return v1 + v2
            }
        })

        graph.addMutation(mutation1)
        graph.addMutation(mutation2)

        box1.set(0)
        box2.set(0)
        box3.set(1)

        graph.propagate()

        t.is(box1p2.get(), 0, "Correct result calculated")
        t.is(res.get(), 1, "Correct result calculated")

        box1.set(1)

        graph.addMutation(mutation1)
        graph.addMutation(mutation2)

        graph.propagate()

        t.is(res.get(), 2, "Correct result calculated")
        t.is(res.getPrevious().get(), 1, "Can track old value")

        box2.set(1)

        graph.addMutation(mutation1)
        graph.addMutation(mutation2)

        graph.propagate()

        t.is(res.get(), 3, "Correct result calculated")
        t.is(res.getPrevious().get(), 2, "Can track old value")
    })


})
