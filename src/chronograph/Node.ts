// import {Atom, Calculable, ChronoValue, Readable, Writable} from "../chrono/Atom.js";
// import {chronoId, ChronoId} from "../chrono/Id.js";
// import {MutationData, PureCalculation} from "../chrono/Mutation.js";
// import {Base, Constructable, Mixin} from "../class/Mixin.js";
// import {Graph} from "../graph/Graph.js";
// import {Node, ObservedBy, Observer} from "../graph/Node.js";
// import {HasId, Reference, Immutable, VersionedReference} from "./Box.js";
// import {ChronoCalculation} from "./Mutation.js";
//
//
// export const ChronoGraphNode = <T extends Constructable<Graph & HasId & Immutable & Readable>>(base: T) => {
//
//     abstract class ChronoGraphNode extends base {
//         cls         : ChronoGraphNode
//
//         graph       : ChronoGraphNode
//
//
//         // getFromEdges(): Set<this> {
//         //     return new Set<this>([ <any>this.graph ])
//         // }
//
//
//         getNextVersion () : ChronoId {
//             return this.graph ? this.graph.getNextVersion() : chronoId()
//         }
//
//
//         joinGraph(graph : this['graph']) {
//             if (this.graph) {
//                 this.unjoinGraph()
//             }
//
//             this.graph = graph
//         }
//
//
//         unjoinGraph() {
//             delete this.graph
//         }
//
//
//         toString () {
//             return `node ${this.id}, version : ${this.version}`
//         }
//     }
//
//     return ChronoGraphNode
// }
//
// export type ChronoGraphNode = Mixin<typeof ChronoGraphNode>
//
//
// export class MinimalChronoGraphNode extends ChronoGraphNode(
//     Graph(Node(VersionedReference(Reference(Immutable(HasId(Node(Observer(ObservedBy(Readable(Writable(Atom(Base))))))))))))
// ) {
// }
//
//
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export type ComparatorFn<T> = (a : T, b : T) => number
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export const Observable = <T extends Constructable<Atom & Readable & Writable & ObservedBy>>(base : T) => {
//
//     abstract class Observable extends base {
//
//         comparator        : ComparatorFn<ChronoValue>
//
//
//         set (value : ChronoValue) {
//
//             if (this.comparator(this.value, value) !== 0) {
//                 super.set(value)
//
//                 // push changes to observers
//
//                 // return this.calculate()
//             }
//
//             return this
//         }
//     }
//
//     return Observable
// }
//
// export type Observable = Mixin<typeof Observable>
//
//
// export const MinimalObservable = Observable(ObservedBy(Writable(Readable(Atom(Base)))))
//
// export const UserInput = new MinimalObservable()
//
//
// // //---------------------------------------------------------------------------------------------------------------------
// // export const TraceableRead = <T extends Constructable<ChronoAtom & Readable>>(base : T) => {
// //
// //     abstract class TraceableRead extends base {
// //         get ()              : ChronoValue {
// //             this.traceRead()
// //
// //             return super.get()
// //         }
// //
// //         abstract traceRead ()
// //     }
// //
// //     return TraceableRead
// // }
// //
// // export type TraceableRead = Mixin<typeof TraceableRead>
//
//
//
//
// export const ChronoMutationNode = <T extends Constructable<MinimalChronoGraphNode & ChronoCalculation>>(base: T) => {
//
//     abstract class ChronoMutationNode extends base {
//
//         input               : ChronoGraphNode[]
//         as                  : ChronoGraphNode[]
//
//
//         joinGraph(graph : this['graph']) {
//             console.log(`Mutation [${this}] joins graph [${graph}]`)
//
//             super.joinGraph(graph)
//
//             this.input.map((node : ChronoGraphNode) => {
//                 node.joinGraph(graph)
//
//                 node.addEdgeTo(this)
//
//                 this.addEdgeFrom(<any>node)
//             })
//
//             this.as.map((node : ChronoGraphNode) => {
//                 node.joinGraph(graph)
//
//                 node.addEdgeFrom(this)
//
//                 this.addEdgeTo(<any>node)
//             })
//         }
//
//
//         unjoinGraph() {
//         }
//
//
//         // // TODO cache
//         // getToEdges(): Set<this> {
//         //     const res = []
//         //
//         //     this.mapInput(x => res.push(x))
//         //
//         //     return new Set<this>([...res])
//         // }
//         //
//         //
//         // // TODO cache
//         // getFromEdges(): Set<this> {
//         //     return new Set<this>([...<any>(this.as)])
//         // }
//     }
//
//     return ChronoMutationNode
// }
// export type ChronoMutationNode = Mixin<typeof ChronoMutationNode>
//
//
// export const MinimalChronoMutationNode  = ChronoMutationNode(ChronoCalculation(PureCalculation(MutationData(Calculable(MinimalChronoGraphNode)))))
//
//
//
// //
// // //---------------------------------------------------------------------------------------------------------------------
// // export const GraphNode2 = <T extends Constructable<Base>>(base: T) => {
// //
// //     class GraphNode2 extends base {
// //         values          : (Atom & Readable)[]
// //
// //         get () {
// //             return this.values[ this.values.length - 1 ].get()
// //         }
// //
// //         set () {
// //             return this.values[ this.values.length - 1 ].get()
// //         }
// //
// //     }
// //
// //     return GraphNode2
// // }
// // export type GraphNode2 = Mixin<typeof GraphNode2>
