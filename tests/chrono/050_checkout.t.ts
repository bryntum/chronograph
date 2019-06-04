// import { Checkout, MinimalCheckout } from "../../src/chrono/Checkout.js"
// import { ChronoGraph, MinimalChronoGraph } from "../../src/chrono/Graph.js"
//
// declare const StartTest : any
//
// StartTest(t => {
//
//     t.it('Add variable', async t => {
//         const checkout  : Checkout   = MinimalCheckout.new()
//
//         const var1      = checkout.variable(0)
//
//         t.throwsOk(() => checkout.read(var1), 'Unknown identifier')
//
//         checkout.propagate()
//
//         t.is(checkout.read(var1), 0, 'Correct value')
//
//         //--------------
//         const graph2    = checkout.branch()
//
//         const var2      = graph2.variable(1)
//
//         graph2.propagate()
//
//         t.is(graph2.read(var2), 1, 'Correct value')
//
//         //--------------
//         t.throwsOk(() => checkout.read(var2), 'Unknown identifier', 'First branch does not know about variable in 2nd branch')
//     })
//
// })
