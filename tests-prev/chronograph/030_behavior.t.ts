import {Box} from "../../src/chronograph/Box.js";
import {GraphBox, MinimalGraphBox} from "../../src/chronograph/Graph.js";
import {MinimalChronoBehavior, MinimalChronoMutationBox} from "../../src/chronograph/Mutation.js";

declare const StartTest : any

StartTest(t => {

    t.it('Minimal behavior', t => {
        const graph : GraphBox  = MinimalGraphBox.new()

        const box1 : Box        = graph.getBox()
        const box2 : Box        = graph.getBox()
        const box3 : Box        = graph.getBox()


        graph.addBehavior(
            MinimalChronoBehavior.new({
                input       : [],

                calculation : () => {
                    return [
                        MinimalChronoMutationBox.new({
                            input       : [ box1, box2 ],
                            output      : [ box3 ],

                            calculation : (v1, v2) => {
                                return v1 + v2
                            }
                        })
                    ]
                }
            })
        )

        box1.set(0)
        box2.set(1)

        graph.propagate()

        t.is(box3.get(), 1, "Correct result calculated")

        box1.set(1)

        graph.propagate()

        t.is(box3.get(), 2, "Correct result calculated")
        t.is(box3.getPrevious().get(), 1, "Can track old value")

        box2.set(2)

        graph.propagate()

        t.is(box3.get(), 3, "Correct result calculated")
        t.is(box3.getPrevious().get(), 2, "Can track old value")
    })


    t.it('Behavior depending from data', t => {
        const graph : GraphBox  = MinimalGraphBox.new()

        const box0 : Box        = graph.getBox()
        const box1 : Box        = graph.getBox()
        const box2 : Box        = graph.getBox()
        const box3 : Box        = graph.getBox()


        graph.addBehavior(
            MinimalChronoBehavior.new({
                input       : [ box0 ],

                calculation : (v0) => {

                    if (v0 === 'sum')
                        return [
                            MinimalChronoMutationBox.new({
                                input       : [ box1, box2 ],
                                output      : [ box3 ],

                                calculation : (v1, v2) => {
                                    return v1 + v2
                                }
                            })
                        ]
                    else
                        return [
                            MinimalChronoMutationBox.new({
                                input       : [ box1, box2 ],
                                output      : [ box3 ],

                                calculation : (v1, v2) => {
                                    return v1 * v2
                                }
                            })
                        ]
                }
            })
        )

        box0.set('sum')
        box1.set(0)
        box2.set(1)

        graph.propagate()

        t.is(box3.get(), 1, "Correct result calculated")

        box1.set(1)

        graph.propagate()

        t.is(box3.get(), 2, "Correct result calculated")
        t.is(box3.getPrevious().get(), 1, "Can track old value")

        box2.set(2)

        graph.propagate()

        t.is(box3.get(), 3, "Correct result calculated")
        t.is(box3.getPrevious().get(), 2, "Can track old value")

        box0.set('mul')

        graph.propagate()

        t.is(box3.get(), 2, "Correct result calculated after behavior change")
        t.is(box3.getPrevious().get(), 3, "Can track old value")

        box1.set(2)

        graph.propagate()

        t.is(box3.get(), 4, "Correct result calculated after behavior change")
        t.is(box3.getPrevious().get(), 2, "Can track old value")
    })

})
