// export type ChronoAtomId = number | string
//
// // avoid (if (id) {}) mistakes by setting to 1 which is "true" value
// let ATOM_ID : number = 1
//
// export const chronoAtomId = () : ChronoAtomId => ATOM_ID++
//
//
// export type ChronoValue         = any
//
// export type ChronoAtomUpdateFn  = (
//     inputs                  : { [string] : CVar },
//     proposedValue           : ChronoValue,
//     conflict                : (conflict : Conflict, resolutions : ResolutionOption[]) => Promise<ResolutionOption>,
//     final                   : (Date) => void,
//     next                    : (value : ChronoValue) => ChronoValue,
//     context                 : CalculationContext
// ) => (any | Promise<any>)
//
//
// export type ChronoQuery = () => []
//
// export const CMap               = (name, key?) => new ChronoDefMapKey(name, key)
//
// export const CVar               = (name) => new ChronoDefVar(name)
//
// export const CArray             = (name) => new ChronoDefArray(name)
//
//
// export interface ChronoValueBag {
//     get(name : string) : any
//     set(name : string, value : any) : void
// }
//
//
// export class ChronoValueBag implements IChronoValueBag {
//     bag         : object
//
//
//     constructor (bagConfig? : object) {
//         this.bag    = bagConfig || {}
//     }
//
//     get (name : string) : any {
//         return this.bag[ name ]
//     }
//
//
//     set (name : string, value : any) : void {
//         this.bag[ name ] = value
//     }
// }
//
//
//
// export class ChronoAtom {
//     id                  : ChronoAtomId = chronoAtomId()
//
//     graph               : ChronoGraph
//
//     description         : string
//
//     valueBag            : IChronoValueBag
//     valueKey            : string
//
//
//     register(graph : ChronoGraph) {
//         this.graph      = graph
//     }
//
//
//     // getConsistentValue() : ChronoAtomValue {
//     //     return this.valueBag ? this.valueBag.get(this.valueKey) : undefined
//     // }
//     //
//     //
//     // getValue() : ChronoAtomValue {
//     //     return this.valueNext !== undefined ? this.valueNext : this.getConsistentValue()
//     // }
//     //
//     //
//     // setValue(value : ChronoAtomValue) {
//     //     if (this.graph.valuesComparator(this.getValue(), value) !== 0) {
//     //         this.valueNext = value
//     //         this.graph.markAtomDirty(this)
//     //     }
//     // }
//     //
//     //
//     // getNextValue () {
//     //     return this.valueNext
//     // }
//     //
//     //
//     // setValuePropagate(value : ChronoAtomValue) {
//     //     this.setValue(value)
//     //
//     //     return this.graph.calculateNextVersionTopologically()
//     // }
//     //
//     //
//     // commit() {
//     //     if (!this.readOnly && this.valueNext !== undefined && this.valueBag) {
//     //         this.valueBag.set(this.valueKey, this.valueNext)
//     //     }
//     //
//     //     this.valueNext = undefined
//     // }
//     //
//     //
//     // reject() {
//     //     this.valueNext = undefined
//     // }
//     //
//     //
//     // isDirty () : boolean {
//     //     return this.graph.isAtomDirty(this)
//     // }
// }
//
//
// // variables description data
// type ChronoDefVarHash   = string
//
// class ChronoDefVar {
//     name        : string
//
//     constructor (name : string) {
//         this.name   = name
//     }
//
//     getHash () : ChronoDefVarHash {
//         return 'V' + this.name
//     }
// }
//
//
// class ChronoDefArray extends ChronoDefVar {
//     getHash () : ChronoDefVarHash {
//         return 'A' + this.name
//     }
// }
//
//
// class ChronoDefMapKey extends ChronoDefVar {
//     key         : string = '*'
//
//     constructor (name : string, key? : string) {
//         super(name)
//
//         if (key) this.key = key
//     }
//
//     as (key : string | number) {
//         this.key        = String(key)
//
//         return this
//     }
//
//     getHash () : ChronoDefVarHash {
//         return 'M' + this.name + '/' + this.key
//     }
//
//     getHashOfKey (key : string) : ChronoDefVarHash {
//         return 'M' + this.name + '/' + key
//     }
//
// }
// // eof variables description data
//
//
// // publish variables
// class ChronoVar {
//     name            : string
//
//     constructor (name : string) {
//         this.name = name
//     }
// }
//
// class ChronoArray extends ChronoVar {
// }
//
// class ChronoMap extends ChronoVar {
//     items           : Set<string> = new Set()
//
//     addKey (key : string) {
//         this.items.add(key)
//     }
//
//     deleteKey (key : string) {
//         this.items.delete(key)
//     }
//
//     hasKey (key : string) : boolean {
//         return this.items.has(key)
//     }
//
//     forEachKey (func : (key : string) => any) {
//         this.items.forEach(func)
//     }
// }
// // eof publish variables
//
//
//
// class ChronoNamespace {
//     variables               : Map<string, ChronoVar> = new Map()
//
//     atomInputsByDefVarHash  : Map<ChronoDefVarHash, Map<ChronoAtom, InputName>> = new Map()
//
//     singleVarAtoms          : Map<ChronoDefVarHash, ChronoAtom> = new Map()
//     arrayVarAtoms           : Map<ChronoDefVarHash, Set<ChronoAtom>> = new Map()
//     mapVarAtoms             : Map<ChronoDefVarHash, Map<ChronoMapKey, ChronoAtom>> = new Map()
//
//
//     registerDefVar(defVar : ChronoDefVar) {
//         const varName           = defVar.name
//         const variables         = this.variables
//         const existingVar       = variables.get(varName)
//
//         if (defVar instanceof ChronoDefMapKey) {
//             if (!defVar.key || defVar.key === '*') throw new Error("Can't publish atom as whole map, specify key")
//
//             if (!existingVar) {
//                 let map         = new ChronoMap(varName)
//
//                 variables.set(varName, map)
//
//                 map.addKey(defVar.key)
//             }
//             else if (existingVar instanceof ChronoMap) {
//                 if (existingVar.hasKey(defVar.key)) throw new Error("duplicate key definition")
//
//                 existingVar.addKey(defVar.key)
//             } else
//                 throw new Error("Variable already declared and its not a map")
//         }
//         else if (defVar instanceof ChronoDefArray) {
//             if (!existingVar) {
//                 variables.set(varName, new ChronoArray(varName))
//             }
//             else if (!(existingVar instanceof ChronoArray)) {
//                 throw new Error("Variable already declared and its not an array")
//             }
//         }
//         else if (defVar instanceof ChronoDefVar) {
//             if (existingVar)
//                 throw new Error("duplicate var definition")
//             else
//                 variables.set(varName, new ChronoVar(varName))
//         }
//     }
//
//
//     unRegisterDefVar(defVar : ChronoDefVar) {
//         const varName           = defVar.name
//         const variables         = this.variables
//         const existingVar       = variables.get(varName)
//
//         if (!existingVar) return
//
//         if (defVar instanceof ChronoDefMapKey) {
//             if (!defVar.key || defVar.key === '*') throw new Error("Can't unpublish atom as whole map, specify key")
//
//             if (existingVar instanceof ChronoMap) {
//                 existingVar.deleteKey(defVar.key)
//             } else
//                 throw new Error("Variable already declared and its not a map")
//         }
//         else if (defVar instanceof ChronoDefArray) {
//         }
//         else if (defVar instanceof ChronoDefVar) {
//             variables.delete(varName)
//         }
//     }
//
//
//     registerAtom (atom : ChronoAtom) {
//         atom.tags.forEach(defVar => defVar && this.publishAtomAsDefVar(atom, defVar))
//
//         this.registerAtomInputs(atom)
//     }
//
//
//     unregisterAtom (atom : ChronoAtom) {
//         atom.tags.forEach(defVar => defVar && this.unPublishAtomAsDefVar(atom, defVar))
//
//         this.unRegisterAtomInputs(atom)
//     }
//
//
//     publishAtomAsDefVar (atom : ChronoAtom, defVar : ChronoDefVar) {
//         this.registerDefVar(defVar)
//
//         const hash      = defVar.getHash()
//
//         if (defVar instanceof ChronoDefMapKey) {
//             this.singleVarAtoms.set(hash, atom)
//
//             const wholeMapHash      = defVar.getHashOfKey('*')
//
//             let atoms               = this.mapVarAtoms.get(wholeMapHash)
//
//             if (!atoms) {
//                 atoms               = new Map()
//
//                 this.mapVarAtoms.set(wholeMapHash, atoms)
//             }
//
//             atoms.set(defVar.key, atom)
//         }
//         else if (defVar instanceof ChronoDefArray) {
//             let atoms               = this.arrayVarAtoms.get(hash)
//
//             if (!atoms) {
//                 atoms               = new Set()
//
//                 this.arrayVarAtoms.set(hash, atoms)
//             }
//
//             atoms.add(atom)
//         }
//         else if (defVar instanceof ChronoDefVar) {
//             this.singleVarAtoms.set(hash, atom)
//         }
//     }
//
//
//     registerAtomInputs (atom : ChronoAtom) {
//         Object.keys(atom.inputs).forEach(inputName => {
//             const inputDefVar   = atom.inputs[ inputName ]
//
//             if (inputDefVar) {
//                 const hash          = inputDefVar.getHash()
//
//                 let atomsMapByHash  = this.atomInputsByDefVarHash.get(hash)
//
//                 if (!atomsMapByHash) {
//                     atomsMapByHash  = new Map()
//
//                     this.atomInputsByDefVarHash.set(hash, atomsMapByHash)
//                 }
//
//                 atomsMapByHash.set(atom, inputName)
//             }
//         })
//     }
//
//
//     unPublishAtomAsDefVar (atom : ChronoAtom, defVar : ChronoDefVar) {
//         this.unRegisterDefVar(defVar)
//
//         const hash      = defVar.getHash()
//
//         if (defVar instanceof ChronoDefMapKey) {
//             this.singleVarAtoms.delete(hash)
//
//             const wholeMapHash      = defVar.getHashOfKey('*')
//
//             let atoms               = this.mapVarAtoms.get(wholeMapHash)
//
//             if (atoms) {
//                 atoms.delete(defVar.key)
//
//                 if (atoms.size === 0) this.mapVarAtoms.delete(wholeMapHash)
//             }
//         }
//         else if (defVar instanceof ChronoDefArray) {
//             let atoms               = this.arrayVarAtoms.get(hash)
//
//             if (atoms) {
//                 atoms.delete(atom)
//
//                 if (atoms.size === 0) this.arrayVarAtoms.delete(hash)
//             }
//         }
//         else if (defVar instanceof ChronoDefVar) {
//             this.singleVarAtoms.delete(hash)
//         }
//     }
//
//
//     unRegisterAtomInputs (atom : ChronoAtom) {
//         Object.keys(atom.inputs).forEach(inputName => {
//             const inputDefVar   = atom.inputs[ inputName ]
//
//             if (inputDefVar) {
//                 const hash          = inputDefVar.getHash()
//
//                 let atomsMapByHash  = this.atomInputsByDefVarHash.get(hash)
//
//                 if (atomsMapByHash) {
//                     atomsMapByHash.delete(atom)
//
//                     if (atomsMapByHash.size === 0) this.atomInputsByDefVarHash.delete(hash)
//                 }
//             }
//         })
//     }
//
//
//     forEachAtomPublishingToDefVar (defVar : ChronoDefVar, func : (atom : ChronoAtom) => any) {
//         const hash      = defVar.getHash()
//
//         if (defVar instanceof ChronoDefMapKey) {
//             if (defVar.key === '*') {
//                 const wholeMapHash  = defVar.getHashOfKey('*')
//                 let atoms           = this.mapVarAtoms.get(wholeMapHash)
//
//                 atoms && atoms.forEach(func)
//
//             } else {
//                 let atom            = this.singleVarAtoms.get(hash)
//
//                 atom && func(atom)
//             }
//         }
//         else if (defVar instanceof ChronoDefArray) {
//             let atoms               = this.arrayVarAtoms.get(hash)
//
//             atoms && atoms.forEach(func)
//         }
//         else if (defVar instanceof ChronoDefVar) {
//             const atom              = this.singleVarAtoms.get(hash)
//
//             atom && func(atom)
//         }
//     }
//
//
//     forEachAtomReferencingDefVar (defVar : ChronoDefVar, func : (inputName : InputName, atom : ChronoAtom) => any) {
//         const inputs    = this.atomInputsByDefVarHash.get(defVar.getHash())
//
//         inputs && inputs.forEach(func)
//
//         if (defVar instanceof ChronoDefMapKey && defVar.key !== '*') {
//             this.forEachAtomReferencingDefVar(CMap(defVar.name), func)
//         }
//     }
//
//
//     collectValue (defVar : ChronoDefVar) : any {
//         let result
//
//         //const varName       = defVar.name
//         //const variable      = this.variables.get(varName)
//
//         //if (!variable) throw new Error("Unknown variable: " + varName)
//
//         const hash      = defVar.getHash()
//
//         if (defVar instanceof ChronoDefMapKey) {
//             if (defVar.key === '*') {
//                 let atoms           = this.mapVarAtoms.get(hash)
//
//                 result              = new Map()
//
//                 atoms && atoms.forEach((atom, chronoMapKey) => {
//                     result.set(chronoMapKey, atom.getValue())
//                 })
//
//             } else {
//                 let atom            = this.singleVarAtoms.get(hash)
//
//                 result              = atom ? atom.getValue() : undefined
//             }
//         }
//         else if (defVar instanceof ChronoDefArray) {
//             let atoms               = this.arrayVarAtoms.get(hash)
//
//             result                  = []
//
//             if (atoms) {
//                 for (let atom of atoms) result.push(atom.getValue())
//             }
//         }
//         else if (defVar instanceof ChronoDefVar) {
//             const atom              = this.singleVarAtoms.get(hash)
//
//             result                  = atom ? atom.getValue() : undefined
//         }
//
//         return result
//     }
// }
//
//
//
// // --- Graph ---
//
// type ChronoEdgeAdjacencyMap     = Map<ChronoAtomId, Set<ChronoAtomId>>
//
//
// export class ChronoGraph {
//
//     fromIdEdges         : ChronoEdgeAdjacencyMap = new Map()
//
//     toIdEdges           : ChronoEdgeAdjacencyMap = new Map()
//
//     atoms               : Map<ChronoAtomId, ChronoAtom> = new Map()
//
//
//
//
//     _topologicalOrder   : [ Array<ChronoAtom>, Map<ChronoAtomId, number> ]
//
//     dirty               : Set<ChronoAtomId> = new Set()
//
//     globalNamespace     : ChronoNamespace = new ChronoNamespace()
//
//     isPropagating       : boolean = false
//
//
//
//     // this is a function property, not method
//     valuesComparator    : ComparatorFn<ChronoAtomValue> = (value1, value2) => {
//         if (value1 === Object(value1) && value2 === Object(value2)) {
//             const comparator    = value1[ ComparatorSymbol ] || value2[ ComparatorSymbol ]
//
//             if (comparator)
//                 return comparator(value1, value2)
//             else
//                 return value1.valueOf() == value2.valueOf() ? 0 : 1
//         }
//
//         return value1 === value2 ? 0 : 1
//     }
//
//
//     commitVersion() {
//         this.dirty.forEach((atomId) => this.atoms.get(atomId).commit())
//
//         this.dirty.clear()
//     }
//
//
//     rejectVersion() {
//         this.dirty.forEach((atomId) => this.atoms.get(atomId).reject())
//
//         this.dirty.clear()
//     }
//
//
//     addAtoms(atoms : ChronoAtom[]) : void {
//         atoms.forEach((atom) => this.addAtom(atom))
//     }
//
//
//     addAtom(atom : ChronoAtom) : void {
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
//             this.globalNamespace.registerAtom(atom)
//
//             this.addEdgesForAtom(atom)
//
//             if (atom.getValue() === undefined) {
//                 this.markAtomDirty(atom)
//             }
//         }
//         else {
//             throw new Error("Atom with the this id already exists: " + atomId)
//         }
//     }
//
//
//     addEdgesForAtom (atom : ChronoAtom) {
//         atom.tags.forEach(defVar => {
//
//             defVar && this.globalNamespace.forEachAtomReferencingDefVar(defVar, (inputName, toAtom) => {
//                 this.addEdge(atom, toAtom)
//             })
//         })
//
//         Object.keys(atom.inputs).forEach(inputName => {
//             const defVar        = atom.inputs[ inputName ]
//
//             defVar && this.globalNamespace.forEachAtomPublishingToDefVar(
//                 defVar,
//                 fromAtom => this.addEdge(fromAtom, atom)
//             )
//         })
//     }
//
//
//     removeEdgesForAtom (atom : ChronoAtom) {
//         atom.tags.forEach(defVar => {
//
//             defVar && this.globalNamespace.forEachAtomReferencingDefVar(defVar, (inputName, toAtom) => {
//                 this.removeEdge(atom, toAtom)
//             })
//         })
//
//         Object.keys(atom.inputs).forEach(inputName => {
//             const defVar        = atom.inputs[ inputName ]
//
//             defVar && this.globalNamespace.forEachAtomPublishingToDefVar(
//                 defVar,
//                 fromAtom => this.removeEdge(fromAtom, atom)
//             )
//         })
//     }
//
//
//     removeAtoms (atoms : ChronoAtom[]) {
//         atoms.forEach(atom => this.removeAtom(atom))
//     }
//
//
//     removeAtom (atom : ChronoAtom) : void {
//         if (!atom) return
//
//         this.removeEdgesForAtom(atom)
//
//         this.globalNamespace.unregisterAtom(atom)
//
//         this.atoms.delete(atom.id)
//
//         this.fromIdEdges.delete(atom.id)
//         this.toIdEdges.delete(atom.id)
//
//         this.dirty.delete(atom.id)
//     }
//
//
//     getEdgeLabel(fromAtomId : ChronoAtomId, toAtomId : ChronoAtomId) : ChronoEdgeLabel {
//         const atoms = this.atoms,
//               fromAtom = atoms.get(fromAtomId),
//               toAtom   = atoms.get(toAtomId)
//
//         const inputsFrom = Object.keys(toAtom.inputs).reduce((acc, inputKey) => {
//             const input         = toAtom.inputs[inputKey]
//
//             if (input) {
//                 const inputVarName  = input.name
//
//                 acc                 = fromAtom.tags.reduce((acc, outputVar) => {
//                     if (outputVar && outputVar.name == inputVarName) {
//                         acc.push(inputKey)
//                     }
//                     return acc
//                 }, acc)
//             }
//
//             return acc
//         }, [])
//
//         return inputsFrom.join(',')
//     }
//
//
//     addEdge(fromAtom : ChronoAtom, toAtom : ChronoAtom) {
//         if (!this.atoms.has(fromAtom.id)) throw new Error("No `from` atom")
//         if (!this.atoms.has(toAtom.id))   throw new Error("No `to` atom")
//
//         const fromSet   = this.fromIdEdges.get(fromAtom.id)
//
//         fromSet.add(toAtom.id)
//
//         const toSet     = this.toIdEdges.get(toAtom.id)
//
//         toSet.add(fromAtom.id)
//
//         this._topologicalOrder = null
//
//         this.markAtomDirty(toAtom)
//     }
//
//
//     removeEdge(fromAtom : ChronoAtom, toAtom : ChronoAtom) {
//         this.edgeLabels.delete(fromAtom.id + '-' + toAtom.id)
//
//         this.fromIdEdges.get(fromAtom.id).delete(toAtom.id)
//         this.toIdEdges.get(toAtom.id).delete(fromAtom.id)
//
//         this.markAtomDirty(toAtom)
//     }
//
//
//     calculateNextVersionTopologically () : Promise<any> {
//         if (this.isPropagating) throw new Error("Graph calculation synchronization inconsistency")
//
//         this.isPropagating  = true
//
//         const [ topoOrder, topoIndicies ]   = this.getTopologicalOrder()
//
//         let maxIndex                = -1
//
//         for (let id of this.dirty) {
//             const index = topoIndicies.get(id)
//
//             if (index > maxIndex) maxIndex = index
//         }
//
//         return this.recalculateTopologicallyFrom(maxIndex).then(() => {
//             this.isPropagating  = false
//
//             this.commitVersion()
//         })
//     }
//
//
//     isAtomDirty(atom : ChronoAtom) : boolean {
//         return this.dirty.has(atom.id);
//     }
//
//
//     markAtomDirty(atom : ChronoAtom) {
//         this.dirty.add(atom.id)
//     }
//
//
//     getTopologicalOrder() {
//         if (this._topologicalOrder) return this._topologicalOrder
//
//         return this._topologicalOrder = this.calculateTopologicalOrder()
//     }
//
//
//     calculateTopologicalOrder () : [ Array<ChronoAtom>, Map<ChronoAtomId, number> ] {
//         let result          = []
//         let indices         = new Map<ChronoAtomId, number>()
//
//         let visited         = new Map<ChronoAtom, number>()
//
//         this.atoms.forEach((atom, atomId) => {
//             if (indices.has(atomId)) return
//
//             let depth           = 1
//             let toVisit         = [ atomId ]
//
//             while (toVisit.length) {
//
//                 atom            = this.atoms.get(toVisit[ toVisit.length - 1 ])
//
//                 if (indices.has(atom.id)) {
//                     toVisit.pop()
//                     depth--
//                     continue
//                 }
//
//                 const visitedAtDepth    = visited.get(atom)
//
//                 if (visitedAtDepth != null) {
//                     if (visitedAtDepth < depth)
//                         throw new Error("Cycle in graph")
//                     else {
//                         result.push(atom)
//                         indices.set(atom.id, result.length - 1)
//
//                         toVisit.pop()
//                         depth--
//                     }
//                 } else {
//                     visited.set(atom, depth)
//
//                     const children  = this.fromIdEdges.get(atom.id)
//
//                     if (children.size) {
//                         children.forEach(child => toVisit.push(child))
//
//                         depth       += children.size
//                     } else {
//                         result.push(atom)
//                         indices.set(atom.id, result.length - 1)
//
//                         toVisit.pop()
//                         depth--
//                     }
//                 }
//             }
//         })
//
//         return [ result, indices ]
//     }
//
//
//     collectAtomFnInput(atom : ChronoAtom) : Object {
//         let input           = {}
//
//         for (let inputName in atom.inputs) {
//             const defVar    = atom.inputs[ inputName ]
//
//             if (defVar) {
//                 input[ inputName ] = this.globalNamespace.collectValue(defVar)
//             }
//         }
//
//         return input
//     }
//
//
//     // TODO: Max to refactor this
//     needRecalculation (atom : ChronoAtom) : boolean {
//         if (this.dirty.has(atom.id)) {
//             return true
//         }
//
//         const inputAtomIds  = this.toIdEdges.get(atom.id)
//         const values        = inputAtomIds.values()
//
//         // TODO benchmark the iterators over Map
//         for (let i = values.next(); !i.done; i = values.next()) {
//             const atomId    = i.value
//
//             if (this.dirty.has(atomId)) return true
//         }
//
//         return false
//     }
//
//
//     recalculateTopologicallyFrom (index : number) : Promise<any> {
//         const [ topoOrder ] = this.getTopologicalOrder()
//
//         for (let i = index; i >= 0; i--) {
//             const atom      = topoOrder[ i ]
//
//             if (!this.needRecalculation(atom)) continue
//
//             const input     = this.collectAtomFnInput(atom)
//
//             const currentValue      = atom.getConsistentValue()
//             const nextValue         = atom.getNextValue()
//
//             const calculatedValue   = atom.fn(input, currentValue, nextValue)
//
//             if (nextValue !== undefined) {
//                 if (this.valuesComparator(calculatedValue, nextValue) !== 0) {
//                     // this.rejectVersion()
//                     //
//                     // return Promise.resolve();
//
//                     throw new Error("Graph inconsistency")
//                 }
//             } else {
//                 atom.setValue(calculatedValue)
//             }
//         }
//
//         return Promise.resolve();
//     }
//
//
//     toDot() {
//         const edgeLabels = this.edgeLabels
//
//         let dot = [
//             "digraph ChronoGraph {",
//             "splines=line"
//         ]
//
//         const arrAtoms : ChronoAtom[] = Array.from(this.atoms.values());
//
//         // Group atoms into subgraphs by label
//
//         const namedAtomsByGroup : Map<string, Set<[string, ChronoAtom]>> = arrAtoms.reduce(
//             (map, atom) => {
//                 const label = atom.label || '?',
//                       group = atom.group || '?'
//
//                 if (!map.has(group)) {
//                     map.set(group, new Set([[label, atom]]))
//                 }
//                 else {
//                     map.get(group).add([label, atom])
//                 }
//
//                 return map
//             },
//             new Map()
//         )
//
//         // Generate subgraphs
//         dot = Array.from(namedAtomsByGroup.entries()).reduce(
//             (dot, [group, namedAtoms], index) => {
//                 dot.push(`subgraph cluster_${index} {`);
//
//                 dot.push(`label="${group}"`)
//
//                 dot = Array.from(namedAtoms.values()).reduce(
//                     (dot, [name, atom]) => {
//                         let value = atom.getValue()
//
//                         if (value instanceof Date) {
//                             value = [value.getFullYear(), '.', value.getMonth() + 1, '.', value.getDay(), ' ', value.getHours() + ":" + value.getMinutes()].join('')
//                         }
//
//                         let color = this.isAtomDirty(atom) ? 'red' : 'darkgreen'
//
//                         dot.push(`"${atom.id}" [label="${name}=${value}", fontcolor="${color}"]`)
//
//                         return dot
//                     },
//                     dot
//                 )
//
//                 dot.push("}")
//
//                 return dot;
//             },
//             dot
//         )
//
//         // Generate edges
//         dot = Array.from(this.fromIdEdges.entries()).reduce(
//             (dot, [fromId, toIds]) => {
//
//                 Array.from(toIds).reduce(
//                     (dot, toId) => {
//
//                         let edgeLabel = this.getEdgeLabel(fromId, toId)
//
//                         let color = this.isAtomDirty(this.atoms.get(fromId)) ? 'red' : 'green'
//
//                         dot.push(`"${fromId}" -> "${toId}" [label="${edgeLabel}", color="${color}"]`)
//
//                         return dot
//                     },
//                     dot
//                 )
//
//                 return dot
//             },
//             dot
//         );
//
//         dot.push("}")
//
//         return dot.join("\n");
//     }
// }
