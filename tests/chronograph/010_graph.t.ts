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


    t.it('2 mutations in graph context', t => {
        const graph : GraphBox  = MinimalGraphBox.new({ id : 'graph' })

        const box1 : Box        = graph.getBox('inp1')
        const box2 : Box        = graph.getBox('inp2')
        const box1p2 : Box      = graph.getBox('1p2')
        const box3 : Box        = graph.getBox('inp3')
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


    t.iit('2 mutations in graph context', t => {
        const graph : GraphBox  = MinimalGraphBox.new({ id : 'graph' })

        const box1 : Box        = graph.getBox('inp1')
        const box2 : Box        = graph.getBox('inp2')
        const box1p2 : Box      = graph.getBox('1p2')
        const box3 : Box        = graph.getBox('inp3')
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
                return v1 + v2
            }
        })

        const calculation1Spy   = t.spyOn(mutation1, 'calculation')
        const calculation2Spy   = t.spyOn(mutation2, 'calculation')

        graph.addMutation(mutation1)
        graph.addMutation(mutation2)

        box1.set(0)
        box2.set(0)
        box3.set(1)

        console.log("INITIAL PROPAGATE")

        // debugger

        graph.propagate()

        t.expect(calculation1Spy).toHaveBeenCalled(1)
        t.expect(calculation2Spy).toHaveBeenCalled(1)

        t.is(box1p2.get(), 0, "Correct result calculated")
        t.is(res.get(), 1, "Correct result calculated")

        console.log("SECOND PROPAGATE")

        // should only recalculate mutation2
        box3.set(2)

        const mutation21 = MinimalChronoMutationNode.new({
            id          : 'mutation21',

            input       : [ box1, box2 ],
            output      : [ box1p2 ],

            calculation : (v1, v2) => {
                return v1 + v2
            }
        })

        const mutation22 = MinimalChronoMutationNode.new({
            id          : 'mutation22',

            input       : [ box1p2, box3 ],
            output      : [ res ],

            calculation : (v1, v2) => {
                return v1 + v2
            }
        })


        graph.addMutation(mutation21)
        graph.addMutation(mutation22)

        const calculation1Spy$  = t.spyOn(mutation21, 'calculation')
        const calculation2Spy$  = t.spyOn(mutation22, 'calculation')

        const spy1              = t.spyOn(box1.value, 'forEachIncoming')
        const spy2              = t.spyOn(box1.value, 'forEachOutgoing')

        // debugger

        graph.propagate()

        t.expect(calculation1Spy$).toHaveBeenCalled(0)
        t.expect(calculation2Spy$).toHaveBeenCalled(1)

        t.expect(spy1).toHaveBeenCalled(0) // should not even visit the box1
        t.expect(spy2).toHaveBeenCalled(0) // should not even visit the box1

        t.is(res.get(), 2, "Correct result calculated")
        t.is(res.getPrevious().get(), 1, "Can track old value")
    })



})
