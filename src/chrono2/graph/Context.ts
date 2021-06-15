// import { Meta } from "../atom/Meta.js"
// import { BoxUnbound } from "../data/Box.js"
// import { CalculableBoxUnbound } from "../data/CalculableBox.js"
// import { CalculableBoxGenUnbound } from "../data/CalculableBoxGen.js"
// import { Record } from "../data/Record.js"
// import { ChronoGraph } from "./Graph.js"
//
//
// export type ChronoGraphApi = {
//     Box                 : typeof BoxUnbound,
//
//     CalculableBox       : typeof CalculableBoxUnbound,
//     CalculableBoxStrict : typeof CalculableBoxUnbound,
//     CalculableBoxGen    : typeof CalculableBoxGenUnbound,
//
//     RRecord             : typeof Record
// }
//
//
// export const chronoApi = (graph : ChronoGraph) : ChronoGraphApi => {
//     return {
//         // @ts-ignore
//         Box                 : graph.bindAtomClass(BoxUnbound),
//         // @ts-ignore
//         CalculableBox       : graph.bindAtomClass(CalculableBoxUnbound),
//         // @ts-ignore
//         CalculableBoxStrict : graph.bindAtomClass(CalculableBoxUnbound, Meta.new({ lazy : false })),
//         // @ts-ignore
//         CalculableBoxGen    : graph.bindAtomClass(CalculableBoxGenUnbound),
//         // @ts-ignore
//         RRecord             : graph.bindAtomClass(Record)
//     }
// }
//
//
