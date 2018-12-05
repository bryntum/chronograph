import {Atom, ChronoValue, Readable, Writable} from "./Atom.js";
import {Base, Constructable, Mixin, MixinConstructor} from "../class/Mixin.js";


//---------------------------------------------------------------------------------------------------------------------
export type ImmutableConstructor = MixinConstructor<typeof Immutable>

export const Immutable = <T extends Constructable<Atom & Readable & Writable>>(base: T) => {

    abstract class Immutable extends base {
        previous            : this


        getPrevious () : this {
            return this.previous
        }


        set (value : ChronoValue) : this {
            if (this.hasValue()) {
                return this.next(value)
            } else {
                return super.set(value)
            }
        }


        nextConfig (value : ChronoValue) : Partial<this> {
            return {
                previous        : this,
                value           : value
            } as unknown as Partial<this> // wtf, TODO submit a bug about this
        }


        next (value : ChronoValue) : this {
            if (!this.hasValue()) return this.set(value)

            const cls       = this.constructor as ImmutableConstructor

            return cls.new(this.nextConfig(value)) as this
        }
    }

    return Immutable
}

export type Immutable = Mixin<typeof Immutable>


export const MinimalImmutable = Immutable(Writable(Readable(Atom(Base))))



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
