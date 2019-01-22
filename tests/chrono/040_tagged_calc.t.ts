// import {consume, provide} from "../../src/chrono/Atom.js";

declare const StartTest : any

StartTest(t => {

//     t.xit('Graph dependency cycles should be possible to resolve using tagged values', t => {
//         // We are calculating the following system:
//         //
//         // A = B + C
//         // B = A + C
//         //
//         // We resolve the cycles dividing A value into two A(initial) and A(final), thus
//         // system becomes as:
//         //
//         // A(initial) = value
//         // B          = A(initial) + C
//         // A(final)   = B + C
//
//         const graph : ChronoGraph   = MinimalChronoGraph.new()
//
//         const atomA : ChronoAtom    = graph.addNode(MinimalChronoAtom.new({
//             value           : 1,
//             calculation     : function * (proposedValue : number) {
//                 console.log('A', proposedValue)
//
//                 yield provide(this, 'initial', proposedValue === undefined ? this.get() : proposedValue)
//
//                 return (yield atomB) + (yield atomC)
//             }
//         }))
//
//         const atomB : ChronoAtom    = graph.addNode(MinimalChronoAtom.new({
//             value           : 2,
//             calculation     : function * (proposedValue : number) {
//                 console.log('B', proposedValue)
//
//                 let result : ChronoAtom | any
//
//                 if (proposedValue !== undefined) {
//                     result = proposedValue
//                 }
//                 else {
//                     result = (yield consume(atomA, 'initial')) + (yield atomC)
//                 }
//
//                 return result
//             }
//         }))
//
//         const atomC : ChronoAtom    = graph.addNode(MinimalChronoAtom.new({ value : 3 }))
//
//         t.diag('Initial propagation')
// //debugger
//         graph.propagate()
//
//         t.is(atomC.get(), 3, 'C is correct')
//         t.is(atomB.get(), 4, 'B is correct')
//         t.is(atomA.get(), 7, 'A is correct')
//
//         t.isDeeply(atomA.outgoing, new Set(), 'Atom A has no outgoing deps')
//         t.isDeeply(atomB.incoming, new Set([atomA.intermediateAtoms.get('initial'), atomC]), 'Atom B has two dependencies')
//         t.isDeeply(atomC.outgoing, new Set([atomA, atomB]), 'Atom C has two outgoing dependencies')
//
//         t.diag('Set A')
//
//         console.log('----')
// //debugger
//         atomA.set(10)
//
//         t.is(atomC.get(),  3, 'C is correct')
//         t.is(atomB.get(), 13, 'B is correct')
//         t.is(atomA.get(), 16, 'A is correct')
//     })
})
