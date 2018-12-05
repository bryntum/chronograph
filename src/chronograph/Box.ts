import {Atom, ChronoValue, MinimalRWAtom, Readable, Writable} from "../chrono/Atom.js";
import {chronoId, ChronoId} from "../chrono/Id.js";
import {AnyConstructor, AnyConstructor1, Base, Constructable, Mixin, MixinConstructor} from "../class/Mixin.js";


//---------------------------------------------------------------------------------------------------------------------
export const HasId = <T extends Constructable<Atom>>(base: T) =>

class HasId extends base {
    id      : ChronoId = chronoId()
}

export type HasId = Mixin<typeof HasId>



//---------------------------------------------------------------------------------------------------------------------
export const Reference = <T extends Constructable<Readable & Writable & Atom>>(base: T) => {

    abstract class Reference extends base {
        value   : Atom

        // should resolve the reference from whatever data it is represented with, and save the resolved atom to `this.value`
        resolve () {}
    }

    return Reference
}

export type Reference = Mixin<typeof Reference>



//
// //---------------------------------------------------------------------------------------------------------------------
// export const VersionedReference = <T extends Constructable<Reference & HasId>>(base: T) => {
//
//     abstract class VersionedReference extends base {
//         version: ChronoId = chronoId()
//
//         cls: VersionedNodeConstructor
//
//         // mutable
//         previous: VersionedNode
//         // mutable
//         value: VersionedNode
//
//
//         get() {
//             return this.value ? MinimalRWAtom.prototype.get.call(this.value) : undefined
//         }
//
//
//         set(value: ChronoValue): this {
//             if (this.hasValue()) {
//                 const referencedNode = this.value
//
//                 const nextNode = referencedNode.next(value)
//
//                 this.previous = referencedNode
//
//                 return MinimalRWAtom.prototype.set.call(this, nextNode)
//             } else {
//                 return MinimalRWAtom.prototype.set.call(this, this.bumpEmpty(value))
//             }
//         }
//
//
//         bumpEmpty(value: ChronoValue): VersionedNode {
//             const cls = <VersionedNodeConstructor>(this.cls || this.constructor as any)
//
//             return cls.new({
//                 id: this.id,
//                 previous: null,
//                 value: value,
//                 get: MinimalRWAtom.prototype.get
//             })
//         }
//
//     }
//
//     return VersionedReference
// }
//
// export type VersionedReference = Mixin<typeof VersionedReference>
