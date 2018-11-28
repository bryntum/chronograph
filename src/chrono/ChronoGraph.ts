import {Constructable, Mixin} from "../util/Mixin.js";
import {ChronoAtom, ChronoValue, Readable, TraceableRead} from "./ChronoAtom.js";
import {ChronoId} from "./ChronoId.js";
import {ChronoMutation} from "./ChronoMutation.js";


export const ChronoGraphNode = <T extends Constructable<ChronoAtom & TraceableRead>>(base : T) => {

    abstract class ChronoGraphNode extends base {
        graph           : ChronoGraphLayer


        publishChange () {
            this.graph.onPublish(this)
        }

        traceRead () {
            this.graph.onTraceRead(this)
        }

    }

    return ChronoGraphNode
}

export type ChronoGraphNode = Mixin<typeof ChronoGraphNode>



// type ChronoEdgeAdjacencyMap     = Map<ChronoId, Set<ChronoId>>


export class ChronoGraphLayer {

    previous            : ChronoGraphLayer

    atoms               : Map<ChronoId, ChronoGraphNode> = new Map()

    isOpened            : boolean = true

    dirtyValues         : Map<ChronoId, ChronoValue> = new Map()


    runMutation (mutation : ChronoMutation) {

    }


    onPublish (node : ChronoGraphNode) {
        node.
    }


    onTraceRead (node : ChronoGraphNode & Readable) {
        node.get()
    }


    // inputs          : [ ChronoAtom ]
    //
    // outputs         : [ ChronoAtom ]


    // fromIdEdges         : ChronoEdgeAdjacencyMap = new Map()
    //
    // toIdEdges           : ChronoEdgeAdjacencyMap = new Map()
    //
    //
    // getAtomById (id : ChronoId) : ChronoAtom {
    //     return this.atoms.get(id)
    // }
    //
    //
    // addAtoms (atoms : ChronoAtom[]) {
    //     atoms.forEach((atom) => this.addAtom(atom))
    // }
    //
    //
    // addAtom (atom : ChronoAtom) {
    //     const atomId    = atom.id
    //
    //     const prevAtom  = this.atoms.get(atomId)
    //
    //     if (!prevAtom) {
    //
    //         this.fromIdEdges.set(atomId, new Set())
    //         this.toIdEdges.set(atomId, new Set())
    //
    //         this.atoms.set(atomId, atom)
    //
    //         atom.register(this)
    //
    //         // this.addEdgesForAtom(atom)
    //
    //         // if (atom.getValue() === undefined) {
    //         //     this.markAtomDirty(atom)
    //         // }
    //     } else {
    //         throw new Error("[chronograph] Atom with this id already exists: " + atomId)
    //     }
    // }
}




//
//
//
//
//
//
//
//
// //-----------------------------------------------------------------------------
// type ChronoEdgeAdjacencyMap     = Map<ChronoId, Set<ChronoId>>
//
//
// export class ChronoGraph {
//
//     fromIdEdges         : ChronoEdgeAdjacencyMap = new Map()
//
//     toIdEdges           : ChronoEdgeAdjacencyMap = new Map()
//
//     atoms               : Map<ChronoId, ChronoAtom> = new Map()
//
//
//     getAtomById (id : ChronoId) : ChronoAtom {
//         return this.atoms.get(id)
//     }
//
//
//     addAtoms (atoms : ChronoAtom[]) {
//         atoms.forEach((atom) => this.addAtom(atom))
//     }
//
//
//     addAtom (atom : ChronoAtom) {
//         const atomId    = atom.id
//
//         const prevAtom  = this.atoms.get(atomId)
//
//         if (!prevAtom) {
//
//             this.fromIdEdges.set(atomId, new Set())
//             this.toIdEdges.set(atomId, new Set())
//
//             this.atoms.set(atomId, atom)
//
//             atom.register(this)
//
//             // this.addEdgesForAtom(atom)
//
//             // if (atom.getValue() === undefined) {
//             //     this.markAtomDirty(atom)
//             // }
//         } else {
//             throw new Error("[chronograph] Atom with this id already exists: " + atomId)
//         }
//     }
//
//
//     // addEdgesForAtom (atom : ChronoAtom) {
//     //     // atom.tags.forEach(defVar => {
//     //     //
//     //     //     defVar && this.globalNamespace.forEachAtomReferencingDefVar(defVar, (inputName, toAtom) => {
//     //     //         this.addEdge(atom, toAtom)
//     //     //     })
//     //     // })
//     //     //
//     //     // Object.keys(atom.inputs).forEach(inputName => {
//     //     //     const defVar        = atom.inputs[ inputName ]
//     //     //
//     //     //     defVar && this.globalNamespace.forEachAtomPublishingToDefVar(
//     //     //         defVar,
//     //     //         fromAtom => this.addEdge(fromAtom, atom)
//     //     //     )
//     //     // })
//     // }
//     //
//     //
//     // removeEdgesForAtom (atom : ChronoAtom) {
//     //     // atom.tags.forEach(defVar => {
//     //     //
//     //     //     defVar && this.globalNamespace.forEachAtomReferencingDefVar(defVar, (inputName, toAtom) => {
//     //     //         this.removeEdge(atom, toAtom)
//     //     //     })
//     //     // })
//     //     //
//     //     // Object.keys(atom.inputs).forEach(inputName => {
//     //     //     const defVar        = atom.inputs[ inputName ]
//     //     //
//     //     //     defVar && this.globalNamespace.forEachAtomPublishingToDefVar(
//     //     //         defVar,
//     //     //         fromAtom => this.removeEdge(fromAtom, atom)
//     //     //     )
//     //     // })
//     // }
//     //
//     //
//     // removeAtoms (atoms : ChronoAtom[]) {
//     //     atoms.forEach(atom => this.removeAtom(atom))
//     // }
//     //
//     //
//     // removeAtom (atom : ChronoAtom) : void {
//     //     if (!atom) return
//     //
//     //     this.removeEdgesForAtom(atom)
//     //
//     //     this.atoms.delete(atom.id)
//     //
//     //     this.fromIdEdges.delete(atom.id)
//     //     this.toIdEdges.delete(atom.id)
//     //
//     //     // this.dirty.delete(atom.id)
//     // }
//     //
//     //
//     // addEdge(fromAtom : ChronoAtom, toAtom : ChronoAtom) {
//     //     if (!this.atoms.has(fromAtom.id)) throw new Error("No `from` atom")
//     //     if (!this.atoms.has(toAtom.id))   throw new Error("No `to` atom")
//     //
//     //     const fromSet   = this.fromIdEdges.get(fromAtom.id)
//     //
//     //     fromSet.add(toAtom.id)
//     //
//     //     const toSet     = this.toIdEdges.get(toAtom.id)
//     //
//     //     toSet.add(fromAtom.id)
//     //
//     //     // this._topologicalOrder = null
//     //
//     //     this.markAtomDirty(toAtom)
//     // }
//     //
//     //
//     // removeEdge(fromAtom : ChronoAtom, toAtom : ChronoAtom) {
//     //     this.edgeLabels.delete(fromAtom.id + '-' + toAtom.id)
//     //
//     //     this.fromIdEdges.get(fromAtom.id).delete(toAtom.id)
//     //     this.toIdEdges.get(toAtom.id).delete(fromAtom.id)
//     //
//     //     this.markAtomDirty(toAtom)
//     // }
// }
