import {ChronoAtom, MinimalChronoAtom} from "../../src/chrono/Atom.js";
import {ChronoGraph, MinimalChronoGraph} from "../../src/chrono/Graph.js";

declare const StartTest : any

StartTest(t => {

    t.it('Behavior depending from data', t => {
        const graph : ChronoGraph  = MinimalChronoGraph.new()

        const box0 : ChronoAtom        = graph.createAtom()
        const box1 : ChronoAtom        = graph.createAtom()
        const box2 : ChronoAtom        = graph.createAtom()

        const box3 : ChronoAtom        = graph.addNode(MinimalChronoAtom.new({
            calculation : function * () {
                if ((yield box0) === 'sum') {
                    return (yield box1) + (yield box2)
                } else {
                    return (yield box1) * (yield box2)
                }
            }
        }))

        box0.set('sum')
        box1.set(0)
        box2.set(1)

        graph.propagateWalkDepth()

        t.is(box3.get(), 1, "Correct result calculated")

        box1.set(1)

        graph.propagateWalkDepth()

        t.is(box3.get(), 2, "Correct result calculated")

        box0.set('mul')

        graph.propagateWalkDepth()

        t.is(box3.get(), 1, "Correct result calculated after behavior change")

        box1.set(2)
        box2.set(2)

        graph.propagateWalkDepth()

        t.is(box3.get(), 4, "Correct result calculated after behavior change")
    })

})
