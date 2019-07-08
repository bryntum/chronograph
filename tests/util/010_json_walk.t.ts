// import { OnCycleAction, WalkSource, WalkStep } from "../../src/graph/Walkable.js"
// import { WalkJsonContext } from "../../src/util/WalkJson.js"
//
// declare const StartTest : any
//
//
// StartTest(t => {
//
//     t.it('Should be able to walk on the JSON objects', t => {
//         const walkPathFull  = []
//         const walkPath      = []
//
//         WalkJsonContext.new({
//             onNode : (node : any, walkstep : WalkStep<any, string | symbol>) => {
//                 walkPath.push(node)
//
//                 walkPathFull.push(walkstep)
//             }
//         }).startFrom([ { a : 1 } ])
//
//
//         t.isDeeply(walkPath, [ { a : 1 }, 1 ], 'Correct walk path')
//
//         t.isDeeply(walkPathFull, [
//             { node : { a : 1 }, from : WalkSource, label : undefined },
//             { node : 1, from : { a : 1 }, label : 'a' }
//         ], 'Correct full walk path')
//     })
//
//
//     t.iit('Should be able to walk on the cyclic JSON objects', t => {
//         const walkPathFull  = []
//         const walkPath      = []
//
//         const obj           = {} as any
//         obj.self            = obj
//
//         const obj1          = {} as any
//         obj1.self           = obj1
//
//         t.isDeeply(obj, obj1, 'Correct walk path')
//
//         // WalkJsonContext.new({
//         //     onCycle (node : any, stack : WalkStep<any, string | symbol>[]) : OnCycleAction {
//         //         walkPath.push(node)
//         //
//         //         return OnCycleAction.Resume
//         //     },
//         //
//         //     onNode : (node : any, walkstep : WalkStep<any, string | symbol>) => {
//         //         walkPath.push(node)
//         //
//         //         walkPathFull.push(walkstep)
//         //     }
//         // }).startFrom([ obj ])
//         //
//         //
//         // t.isDeeply(walkPath, [ obj, obj ], 'Correct walk path')
//
//         // t.isDeeply(walkPathFull, [
//         //     { node : { a : 1 }, from : WalkSource, label : undefined },
//         //     { node : 1, from : { a : 1 }, label : 'a' }
//         // ], 'Correct full walk path')
//     })
//
// })
//
//
