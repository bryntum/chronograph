// import { Identifier, Variable } from "../../src/chrono/Quark.js"
//
// declare const StartTest : any
//
// StartTest(t => {
//
//     t.it('Observable as abstract variable identity', async t => {
//         const var1      = Variable.new()
//         const var2      = Variable.new()
//
//         const graph : ChronoGraph   = MinimalChronoGraph.new()
//
//         const var3 : Identifier     = graph.observe(function * () {
//             return (yield var1) + (yield var2)
//         })
//
//         graph.write(var1, 0)
//         graph.write(var2, 1)
//
//         const value                 = graph.read(var3)
//
//         t.isDeeply(value, 1, 'Correct value')
//
//
//         graph.write(var1, 1)
//
//         const value2                = graph.read(var3)
//
//         t.isDeeply(value, 2, 'Correct value')
//
//
//         const value3                = graph.observeValue(function * () {
//             return (yield var3) + 1
//         })
//
//         t.isDeeply(value3, 2, 'Correct value')
//
//     })
// })
