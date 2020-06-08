// import { AnyConstructor } from "../../class/Mixin.js"
// import { Immutable, Owner } from "./Immutable.js"
//
// //---------------------------------------------------------------------------------------------------------------------
// export type RecordDefinition = object
//
// export class RecordImmutable<V extends RecordDefinition> implements Immutable {
//     //region ChronoRecordImmutable as Immutable
//     previous            : this              = undefined
//
//     frozen              : boolean           = false
//
//     owner               : Owner<this> & Record<V> = undefined
//
//
//     freeze () {
//         this.frozen = true
//     }
//
//
//     createNext () : this {
//         this.freeze()
//
//         const self      = this.constructor as AnyConstructor<this, typeof RecordImmutable>
//         const next      = new self()
//
//         next.previous   = this
//         next.owner      = this.owner
//
//         return next
//     }
//     //endregion
//
//
//     //region ChronoRecordImmutable's own interface
//     value               : V                 = undefined
//
//
//     get <FieldName extends keyof V> (fieldName : FieldName) : V[ FieldName ] {
//         if (this.value !== undefined) {
//             const ownValue  = this.value[ fieldName ]
//
//             // if own value === undefined its the same case as the whole `value` is undefined
//             // so we fall through
//             if (ownValue !== undefined) return ownValue
//         }
//
//         if (this.previous !== undefined) return this.previous.get(fieldName)
//
//         return null
//     }
//
//
//     set <FieldName extends keyof V> (fieldName : FieldName, value : V[ FieldName ]) {
//         if (value === undefined) value = null
//
//         if (this.frozen && this.value !== undefined) {
//             const next = this.createNext()
//
//             this.owner.setCurrent(next)
//
//             next.set(fieldName, value)
//
//         } else {
//             if (this.value === undefined) this.value = {} as any
//
//             this.value[ fieldName ]  = value
//         }
//     }
// }
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export class Record<Def extends RecordDefinition> extends RecordImmutable<Def> implements Owner<RecordImmutable<Def>>{
//     //region ChronoBox as Owner
//     immutable       : RecordImmutable<Def>        = this
//
//
//     setCurrent (immutable : RecordImmutable<Def>) {
//         if (immutable.previous !== this.immutable) throw new Error("Invalid state thread")
//
//         this.immutable = immutable
//     }
//     //endregion
//
//
//     //region ChronoRecordOwner as ChronoRecordImmutable interface
//
//     // @ts-ignore
//     owner           : Owner<this> & Record<Def> = this
//
//     createNext () : this {
//         this.freeze()
//
//         const self      = this.constructor as AnyConstructor<this, typeof Record>
//         const next      = new self.immutableCls()
//
//         next.previous   = this
//         next.owner      = this
//
//         // @ts-ignore
//         return next
//     }
//
//     static immutableCls : AnyConstructor<RecordImmutable<object>, typeof RecordImmutable> = RecordImmutable
//     //endregion
//
//
//     //region ChronoRecordOwner as both ChronoRecordOwner & ChronoRecordImmutable interface
//
//     get <FieldName extends keyof Def> (fieldName : FieldName) : Def[ FieldName ] {
//         if (this.immutable === this) return super.get(fieldName)
//
//         return this.immutable.get(fieldName)
//     }
//
//
//     set <FieldName extends keyof Def> (fieldName : FieldName, value : Def[ FieldName ]) {
//         if (this.immutable === this) return super.set(fieldName, value)
//
//         return this.immutable.set(fieldName, value)
//     }
//     //endregion
// }
