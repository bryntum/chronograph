// import { ChronoGraph, MinimalChronoGraph } from "../../src/chrono/Graph.js"
// import { CalculatedValueGen } from "../../src/primitives/Identifier.js"
// import { Reference } from "../../src/primitives/Reference.js"
//
// declare const StartTest : any
//
// StartTest(t => {
//
//     t.it('Reference', async t => {
//         const graph : ChronoGraph   = MinimalChronoGraph.new()
//
//         const var1                  = graph.variableId('var1', 0)
//
//         const ref1                  = graph.addIdentifier(Reference.new({
//             id              : 'ref1'
//         }))
//
//         graph.propagate()
//
//         t.expect(spy1).toHaveBeenCalled(0)
//         t.expect(spy2).toHaveBeenCalled(0)
//
//         // ----------------
//         t.is(graph.read(ident1), 1, "Correct result calculated")
//
//         t.expect(spy1).toHaveBeenCalled(1)
//         t.expect(spy2).toHaveBeenCalled(0)
//
//         // ----------------
//         spy1.reset()
//         spy2.reset()
//
//         t.is(graph.read(ident2), 2, "Correct result calculated")
//
//         t.expect(spy1).toHaveBeenCalled(0)
//         t.expect(spy2).toHaveBeenCalled(1)
//
//         // ----------------
//         spy1.reset()
//         spy2.reset()
//
//         t.is(graph.read(ident2), 2, "Correct result calculated")
//
//         t.expect(spy1).toHaveBeenCalled(0)
//         t.expect(spy2).toHaveBeenCalled(0)
//
//         // ----------------
//         spy1.reset()
//         spy2.reset()
//
//         graph.write(var1, 1)
//
//         graph.propagate()
//
//         t.expect(spy1).toHaveBeenCalled(0)
//         t.expect(spy2).toHaveBeenCalled(0)
//
//         t.is(graph.read(ident2), 3, "Correct result calculated")
//
//         t.expect(spy1).toHaveBeenCalled(1)
//         t.expect(spy2).toHaveBeenCalled(1)
//     })
// })
