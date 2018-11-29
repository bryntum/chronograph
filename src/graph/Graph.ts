import {ChronoValue} from "../chrono/ChronoAtom.js";
import {Base, Constructable, Mixin, Mixin1} from "../util/Mixin.js";




//-----------------------------------------------------------------------------
export const ChronoAtom = <V, T extends Constructable<typeof Base> = typeof Base>(base : T) =>

class ChronoAtom extends base {
    value     : V
}

export type ChronoAtom<Value> = Mixin1<Value, typeof ChronoAtom>


const aa = ChronoAtom<Date, typeof Base>(Base)

aa.new().value.zxc

aa.new().value.getTime()

function zxc(aa : ChronoAtom<Date>) {
    aa.value.zxc

    aa.value.getTime()
}


export type GraphNode   = unknown


export const Graph = <T extends Constructable<Base>>(base : T) => {

    abstract class Graph extends base {


        aa () {

        // calculateTopologicalOrder () : [ Array<ChronoAtom>, Map<ChronoAtomId, number> ] {
            // let result          = []
            // let indices         = new Map<ChronoAtomId, number>()
            //
            // let visited         = new Map<ChronoAtom, number>()
            //
            // this.atoms.forEach((atom, atomId) => {
            //     if (indices.has(atomId)) return
            //
            //     let depth           = 1
            //     let toVisit         = [ atomId ]
            //
            //     while (toVisit.length) {
            //
            //         atom            = this.atoms.get(toVisit[ toVisit.length - 1 ])
            //
            //         if (indices.has(atom.id)) {
            //             toVisit.pop()
            //             depth--
            //             continue
            //         }
            //
            //         const visitedAtDepth    = visited.get(atom)
            //
            //         if (visitedAtDepth != null) {
            //             if (visitedAtDepth < depth)
            //                 throw new Error("Cycle in graph")
            //             else {
            //                 result.push(atom)
            //                 indices.set(atom.id, result.length - 1)
            //
            //                 toVisit.pop()
            //                 depth--
            //             }
            //         } else {
            //             visited.set(atom, depth)
            //
            //             const children  = this.fromIdEdges.get(atom.id)
            //
            //             if (children.size) {
            //                 children.forEach(child => toVisit.push(child))
            //
            //                 depth       += children.size
            //             } else {
            //                 result.push(atom)
            //                 indices.set(atom.id, result.length - 1)
            //
            //                 toVisit.pop()
            //                 depth--
            //             }
            //         }
            //     }
            // })
            //
            // return [ result, indices ]
        }

    }

    return Graph
}

export type Graph = Mixin<typeof Graph>


// export class ChronoGraphLayer {
//
//     previous            : ChronoGraphLayer
//
//     atoms               : Map<ChronoId, ChronoGraphNode> = new Map()
//
//     isOpened            : boolean = true
//
//     dirtyValues         : Map<ChronoId, ChronoValue> = new Map()
//
//
//     runMutation (mutation : ChronoMutation) {
//
//     }
//
//
//     onPublish (node : ChronoGraphNode) {
//     }
//
//
//     onTraceRead (node : ChronoGraphNode & Readable) {
//         node.get()
//     }
//
//
//     // inputs          : [ ChronoAtom ]
//     //
//     // outputs         : [ ChronoAtom ]
//
//
//     // fromIdEdges         : ChronoEdgeAdjacencyMap = new Map()
//     //
//     // toIdEdges           : ChronoEdgeAdjacencyMap = new Map()
//     //
//     //
//     // getAtomById (id : ChronoId) : ChronoAtom {
//     //     return this.atoms.get(id)
//     // }
//     //
//     //
//     // addAtoms (atoms : ChronoAtom[]) {
//     //     atoms.forEach((atom) => this.addAtom(atom))
//     // }
//     //
//     //
//     // addAtom (atom : ChronoAtom) {
//     //     const atomId    = atom.id
//     //
//     //     const prevAtom  = this.atoms.get(atomId)
//     //
//     //     if (!prevAtom) {
//     //
//     //         this.fromIdEdges.set(atomId, new Set())
//     //         this.toIdEdges.set(atomId, new Set())
//     //
//     //         this.atoms.set(atomId, atom)
//     //
//     //         atom.register(this)
//     //
//     //         // this.addEdgesForAtom(atom)
//     //
//     //         // if (atom.getValue() === undefined) {
//     //         //     this.markAtomDirty(atom)
//     //         // }
//     //     } else {
//     //         throw new Error("[chronograph] Atom with this id already exists: " + atomId)
//     //     }
//     // }
//
//
//     calculateNextLayer () {
//
//     }
// }
//
//
//
//
// //
// //
// //
// //
// //
// //
// //
// //
// // //-----------------------------------------------------------------------------
// // type ChronoEdgeAdjacencyMap     = Map<ChronoId, Set<ChronoId>>
// //
// //
// // export class ChronoGraph {
// //
// //     fromIdEdges         : ChronoEdgeAdjacencyMap = new Map()
// //
// //     toIdEdges           : ChronoEdgeAdjacencyMap = new Map()
// //
// //     atoms               : Map<ChronoId, ChronoAtom> = new Map()
// //
// //
// //     getAtomById (id : ChronoId) : ChronoAtom {
// //         return this.atoms.get(id)
// //     }
// //
// //
// //     addAtoms (atoms : ChronoAtom[]) {
// //         atoms.forEach((atom) => this.addAtom(atom))
// //     }
// //
// //
// //     addAtom (atom : ChronoAtom) {
// //         const atomId    = atom.id
// //
// //         const prevAtom  = this.atoms.get(atomId)
// //
// //         if (!prevAtom) {
// //
// //             this.fromIdEdges.set(atomId, new Set())
// //             this.toIdEdges.set(atomId, new Set())
// //
// //             this.atoms.set(atomId, atom)
// //
// //             atom.register(this)
// //
// //             // this.addEdgesForAtom(atom)
// //
// //             // if (atom.getValue() === undefined) {
// //             //     this.markAtomDirty(atom)
// //             // }
// //         } else {
// //             throw new Error("[chronograph] Atom with this id already exists: " + atomId)
// //         }
// //     }
// //
// //
// //     // addEdgesForAtom (atom : ChronoAtom) {
// //     //     // atom.tags.forEach(defVar => {
// //     //     //
// //     //     //     defVar && this.globalNamespace.forEachAtomReferencingDefVar(defVar, (inputName, toAtom) => {
// //     //     //         this.addEdge(atom, toAtom)
// //     //     //     })
// //     //     // })
// //     //     //
// //     //     // Object.keys(atom.inputs).forEach(inputName => {
// //     //     //     const defVar        = atom.inputs[ inputName ]
// //     //     //
// //     //     //     defVar && this.globalNamespace.forEachAtomPublishingToDefVar(
// //     //     //         defVar,
// //     //     //         fromAtom => this.addEdge(fromAtom, atom)
// //     //     //     )
// //     //     // })
// //     // }
// //     //
// //     //
// //     // removeEdgesForAtom (atom : ChronoAtom) {
// //     //     // atom.tags.forEach(defVar => {
// //     //     //
// //     //     //     defVar && this.globalNamespace.forEachAtomReferencingDefVar(defVar, (inputName, toAtom) => {
// //     //     //         this.removeEdge(atom, toAtom)
// //     //     //     })
// //     //     // })
// //     //     //
// //     //     // Object.keys(atom.inputs).forEach(inputName => {
// //     //     //     const defVar        = atom.inputs[ inputName ]
// //     //     //
// //     //     //     defVar && this.globalNamespace.forEachAtomPublishingToDefVar(
// //     //     //         defVar,
// //     //     //         fromAtom => this.removeEdge(fromAtom, atom)
// //     //     //     )
// //     //     // })
// //     // }
// //     //
// //     //
// //     // removeAtoms (atoms : ChronoAtom[]) {
// //     //     atoms.forEach(atom => this.removeAtom(atom))
// //     // }
// //     //
// //     //
// //     // removeAtom (atom : ChronoAtom) : void {
// //     //     if (!atom) return
// //     //
// //     //     this.removeEdgesForAtom(atom)
// //     //
// //     //     this.atoms.delete(atom.id)
// //     //
// //     //     this.fromIdEdges.delete(atom.id)
// //     //     this.toIdEdges.delete(atom.id)
// //     //
// //     //     // this.dirty.delete(atom.id)
// //     // }
// //     //
// //     //
// //     // addEdge(fromAtom : ChronoAtom, toAtom : ChronoAtom) {
// //     //     if (!this.atoms.has(fromAtom.id)) throw new Error("No `from` atom")
// //     //     if (!this.atoms.has(toAtom.id))   throw new Error("No `to` atom")
// //     //
// //     //     const fromSet   = this.fromIdEdges.get(fromAtom.id)
// //     //
// //     //     fromSet.add(toAtom.id)
// //     //
// //     //     const toSet     = this.toIdEdges.get(toAtom.id)
// //     //
// //     //     toSet.add(fromAtom.id)
// //     //
// //     //     // this._topologicalOrder = null
// //     //
// //     //     this.markAtomDirty(toAtom)
// //     // }
// //     //
// //     //
// //     // removeEdge(fromAtom : ChronoAtom, toAtom : ChronoAtom) {
// //     //     this.edgeLabels.delete(fromAtom.id + '-' + toAtom.id)
// //     //
// //     //     this.fromIdEdges.get(fromAtom.id).delete(toAtom.id)
// //     //     this.toIdEdges.get(toAtom.id).delete(fromAtom.id)
// //     //
// //     //     this.markAtomDirty(toAtom)
// //     // }
// // }
