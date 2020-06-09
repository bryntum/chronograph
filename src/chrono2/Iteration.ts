// import { Base } from "../class/Base.js"
// import { AnyConstructor } from "../class/Mixin.js"
// import { Immutable, Owner } from "./data/Immutable.js"
// import { ChronoId, Identifiable } from "./Identifiable.js"
// import { Atom, Quark } from "./Quark.js"
//
//
// const TombStone = null
//
// //----------------------------------------------------------------------------------------------------------------------
// export class ChronoIteration extends Base implements Immutable {
//
//     quarks      : Map<ChronoId, Quark> = new Map()
//
//
//     getAtomById (id : ChronoId) : Owner<Immutable> & Identifiable | null {
//         let iteration : this = this
//
//         while (iteration) {
//             const atom  = iteration.atoms.get(id)
//
//             if (atom !== undefined) return atom
//
//             iteration   = iteration.previous
//         }
//
//         return null
//     }
//
//
//     hasAtom <I extends Immutable> (atom : Owner<Immutable> & Identifiable) : boolean {
//         return this.getAtomById(atom.id) !== TombStone
//     }
//
//
//     hasAtomById (id : ChronoId) : boolean {
//         return this.getAtomById(id) !== TombStone
//     }
//
//
//     addAtom <I extends Immutable> (atom : Owner<Immutable> & Identifiable) {
//         if (this.frozen) {
//             const next  = this.createNext()
//
//             this.owner.setCurrent(next)
//
//             next.addAtom(atom)
//         } else {
//             this.atoms.set(atom.id, atom)
//         }
//     }
//
//
//     removeAtom <I extends Immutable> (atom : Owner<Immutable> & Identifiable) {
//         if (this.frozen) {
//             const next  = this.createNext()
//
//             this.owner.setCurrent(next)
//
//             next.removeAtom(atom)
//         } else {
//             this.atoms.set(atom.id, TombStone)
//         }
//     }
//
//
//     removeAtomById (id : ChronoId) {
//         if (this.frozen) {
//             const next  = this.createNext()
//
//             this.owner.setCurrent(next)
//
//             next.removeAtomById(id)
//         } else {
//             this.atoms.set(id, TombStone)
//         }
//     }
//     //endregion
// }
//
//
// //----------------------------------------------------------------------------------------------------------------------
// export class ChronoTransaction extends Base implements Owner, Immutable {
//     //region Transaction as Owner
//     $immutable      : ChronoIteration       = undefined
//
//     get immutable () : ChronoIteration {
//         if (this.$immutable !== undefined) return this.$immutable
//
//         return this.$immutable = ChronoIteration.new({ owner : this })
//     }
//
//     set immutable (value : ChronoIteration) {
//         this.$immutable = value
//     }
//
//
//     setCurrent (immutable : ChronoIteration) {
//         if (this.frozen) {
//             const next = this.createNext()
//
//             this.owner.setCurrent(next)
//
//             next.setCurrent(immutable)
//         } else {
//             if (this.$immutable && immutable.previous !== this.immutable) throw new Error("Invalid state thread")
//
//             this.immutable  = immutable
//         }
//     }
//     //endregion
//
//     //region transaction as Immutable
//     owner       : Owner<this> & ChronoGraph = undefined
//
//     previous    : this                  = undefined
//
//     frozen      : boolean               = false
//
//
//     createNext () : this {
//         this.freeze()
//
//         const self      = this.constructor as AnyConstructor<this, typeof ChronoTransaction>
//         const next      = self.new()
//
//         next.previous   = this
//         next.owner      = this.owner
//
//         return next
//     }
//
//
//     freeze () {
//         if (this.frozen) return
//
//         this.immutable.freeze()
//
//         this.frozen = true
//     }
//     //endregion
//
//     // commit () {
//     //     this.freeze()
//     // }
//     //
//     // reject () {
//     //     if (this.frozen) throw new Error("Can not reject the frozen transaction")
//     //
//     //     this.owner.reject()
//     // }
//
//     //region transaction as Iteration
//     getAtomById (id : ChronoId) : Owner<Immutable> & Identifiable | null {
//         return this.immutable.getAtomById(id)
//     }
//
//     hasAtom <I extends Immutable> (atom : Owner<Immutable> & Identifiable) : boolean {
//         return this.immutable.hasAtom(atom)
//     }
//
//     hasAtomById (id : ChronoId) : boolean {
//         return this.immutable.hasAtomById(id)
//     }
//
//     addAtom <I extends Immutable> (atom : Owner<Immutable> & Identifiable) {
//         this.immutable.addAtom(atom)
//     }
//
//     removeAtom <I extends Immutable> (atom : Owner<Immutable> & Identifiable) {
//         this.immutable.removeAtom(atom)
//     }
//
//     removeAtomById (id : ChronoId) {
//         this.immutable.removeAtomById(id)
//     }
//     //endregion
// }
//
//
// //----------------------------------------------------------------------------------------------------------------------
// export class ChronoGraph extends Base implements Owner {
//     //region ChronoGraph as Owner
//     immutable       : ChronoTransaction     = ChronoTransaction.new({ owner : this })
//
//
//     setCurrent (immutable : ChronoTransaction) {
//         if (immutable.previous !== this.immutable) throw new Error("Invalid state thread")
//
//         this.immutable  = immutable
//     }
//     //endregion
//
//
//     commit () {
//     }
//
//     reject () {
//     }
//
//
//     atoms       : Map<ChronoId, Atom> = new Map()
//
//     //region ChronoGraph as Iteration
//     getAtomById (id : ChronoId) : Atom | null {
//         return this.immutable.getAtomById(id)
//     }
//
//     hasAtom (atom : Atom) : boolean {
//         return this.immutable.hasAtom(atom)
//     }
//
//     hasAtomById (id : ChronoId) : boolean {
//         return this.immutable.hasAtomById(id)
//     }
//
//     addAtom (atom : Atom) {
//         this.immutable.addAtom(atom)
//     }
//
//     removeAtom (atom : Atom) {
//         this.immutable.removeAtom(atom)
//     }
//
//     removeAtomById (id : ChronoId) {
//         this.immutable.removeAtomById(id)
//     }
//     //endregion
// }
