import { MinimalChronoGraph, PropagationResult } from "../../src/chrono/Graph.js";
import { MinimalChronoAtom } from "../../src/chrono/Atom.js";

declare const StartTest : any

StartTest(t => {

    t.it("It should be possible to dry run graph propagation", async t => {

        const graph = MinimalChronoGraph.new();

        let a1, a2, a3

        a1 = MinimalChronoAtom.new({
            calculation : function * (proposeValue : number) {
                return 1
            }
        })

        a2 = MinimalChronoAtom.new({
            calculation : function * (proposedValue : number) {
                return 2
            }
        })

        a3 = MinimalChronoAtom.new({
            calculation : function * (proposedValue : number) {
                return (yield a1) + (yield a2)
            }
        })

        let a3value = undefined
        let result  = await graph.tryPropagateWithNodes(null, [a1, a2, a3], () => {
            a3value = a3.get()
        })

        t.is(graph.getNodes().size, 0, "No nodes left in graph after propagation try")
        t.is(result, PropagationResult.Passed, "Propagation result is Passed")
        t.is(a3.get(), undefined, "Consistent a3 value is undefined")
        t.is(a3value, 3, "Hatched a3 value is correct")
    })
})
