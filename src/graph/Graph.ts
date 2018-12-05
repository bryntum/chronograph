// import {Constructable, Mixin} from "../class/Mixin.js";
// import {Node, ObservedBy, Observer} from "./Node.js";
//
//
// //---------------------------------------------------------------------------------------------------------------------
// /*
//     A graph which is also a node - this is an Observer, that observes a set of ObservedBy nodes - whole graph
//
//     walking from such Observer will visit the whole graph
//
//     note, that graph itself is not observable by its nodes
//
// */
//
// export const Graph = <T extends Constructable<ObservedBy>>(base : T) =>
//
// // graph extends the observer and thus, observers all its nodes through the "fromEdges" collection
// class Graph extends base {
//
//     getNodes () : Set<Node> {
//         return <any>this.toEdges
//     }
//
//
//     hasNode (node : Node) : boolean {
//         return this.toEdges.has(<any>node)
//     }
//
//
//     addNodes (nodes : Node[]) {
//         nodes.forEach(node => this.addNode(node))
//     }
//
//
//     addNode (node : Node) : Node {
//         // <debug>
//         if (this.hasNode(node)) throw new Error("The node already exists")
//         // </debug>
//
//         this.toEdges.add(<any>node)
//
//         return node
//     }
//
//
//     removeNodes (nodes : Node[]) {
//         nodes.forEach(node => this.removeNode(node))
//     }
//
//
//     removeNode (node : Node) {
//         // <debug>
//         if (!this.hasNode(node)) throw new Error("The node does not exists")
//         // </debug>
//
//         this.toEdges.delete(<any>node)
//     }
// }
//
// export type Graph = Mixin<typeof Graph>
