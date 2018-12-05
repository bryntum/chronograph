// import {Base, Constructable, Mixin} from "../class/Mixin.js";
//
//
//
//
// //---------------------------------------------------------------------------------------------------------------------
// // TODO figure out this pattern
//
//
// interface Walkable {
//
//
//     forEachNext () {}
//
//     walk
// }
//
//
//
// interface WalkableBackward {
//     incoming        : Set<WalkableBackward>
//
//     forEachIncoming () {}
//
//     walkBackward
// }
//
// interface WalkableFoward {
//     outgoing        : Set<WalkableFoward>
// }
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export const Observer = <T extends Constructable<Base>>(base : T) =>
//
// class Observer extends base {
//     fromEdges           : Set<this>         = new Set()
//
//     getFromEdges () : Set<this> {
//         return this.fromEdges
//     }
// }
//
// export type Observer = Mixin<typeof Observer>
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export const ObservedBy = <T extends Constructable<Base>>(base : T) =>
//
// class ObservedBy extends base {
//     toEdges             : Set<this>         = new Set()
//
//     getToEdges () : Set<this> {
//         return this.toEdges
//     }
// }
//
// export type ObservedBy = Mixin<typeof ObservedBy>
//
//
//
// export type GraphWalkContext    = {
//     direction               : 'forward' | 'backward'
//
//     onNode                  : (node : Node) => any,
//     onTopologicalNode       : (node : Node) => any
//     onCycle                 : (node : Node) => any,
// }
//
//
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export const Node = <T extends Constructable<Observer & ObservedBy>>(base : T) =>
//
// class Node extends base {
//
//     hasEdgeTo(toNode : this) : boolean {
//         return this.fromEdges.has(toNode)
//     }
//
//
//     hasEdgeFrom(fromNode : this) : boolean {
//         return this.toEdges.has(fromNode)
//     }
//
//
//     addEdgeTo(toNode : this) {
//         this.fromEdges.add(toNode)
//         // toNode.toEdges.add(this)
//     }
//
//
//     addEdgeFrom(fromNode : this) {
//         // fromNode.fromEdges.add(this)
//         this.toEdges.add(fromNode)
//     }
//
//
//     removeEdgeTo(toNode : this) {
//         this.fromEdges.delete(toNode)
//         // toNode.toEdges.delete(this)
//     }
//
//
//     removeEdgeFrom(fromNode : this) {
//         // fromNode.fromEdges.delete(this)
//         this.toEdges.delete(fromNode)
//     }
//
//
//     /**
//
//      TODO move to observable/observedby (different directions)
//
//      TODO generalize to arbitrary JSON, instead of GraphNode instance
//
//      POSSIBLE OPTIMIZATION (need to benchmark)
//      instead of the separate map for visited data
//           const visitedAt             = new Map<this, number>()
//      store the number in the node itself (as non-enumerable symbol property)
//
//      */
//     walkDepth (context : GraphWalkContext) {
//         const visitedAt             = new Map<this, number>()
//
//         let toVisit : this[]        = [ this ]
//
//         let depth
//
//         while (depth = toVisit.length) {
//             let node                = toVisit[ depth - 1 ]
//
//             const visitedAtDepth    = visitedAt.get(node)
//
//             // node has been already visited
//             if (visitedAtDepth != null) {
//
//                 // it is valid to find itself in the visited map, but only if visited at the current depth
//                 // (which indicates stack unwinding)
//                 // if the node has been visited at earlier depth - its a cycle
//                 if (visitedAtDepth < depth)
//                     context.onCycle(node)
//                 else {
//                     // we've processed all outgoing edges from this node,
//                     // now we can add it to topologically sorted results (if needed)
//                     context.onTopologicalNode(node)
//
//                     toVisit.pop()
//                     depth--
//                 }
//             } else {
//                 visitedAt.set(node, depth)
//
//                 context.onNode(node)
//
//                 const next          = context.direction === 'forward' ? node.getFromEdges() : node.getToEdges()
//
//                 if (next.size) {
//                     // TODO check that this iteration is performant (need to benchmark)
//                     next.forEach(child => toVisit.push(child))
//                 } else {
//                     toVisit.pop()
//
//                     // if there's no outgoing edges, node is at topological position
//                     context.onTopologicalNode(node)
//                 }
//             }
//         }
//     }
// }
//
// export type Node = Mixin<typeof Node>
//
//
