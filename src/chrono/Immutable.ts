import {Box, MinimalBox} from "../chronograph/Box.js";
import {GraphSnapshot, GraphSnapshotConstructor, MinimalGraphSnapshot} from "../chronograph/Graph.js";
import {ChronoMutationNode} from "../chronograph/Mutation.js";
import {ChronoGraphNode, MinimalChronoGraphNode} from "../chronograph/Node.js";
import {Atom, ChronoValue, Readable, Writable} from "./Atom.js";
import {Base, Constructable, Mixin, MixinConstructor} from "../class/Mixin.js";
import {ChronoId} from "./Id.js";
import {MutableBox} from "./MutableBox.js";
import {ObservableRead, ObservableWrite} from "./Observation.js";


//---------------------------------------------------------------------------------------------------------------------
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
            return (
                value !== undefined ? {
                    previous        : this,
                    value           : value
                } : {
                    previous        : this
                }
            ) as unknown as Partial<this> // wtf, TODO submit a bug about this
        }


        next (value : ChronoValue) : this {
            if (!this.hasValue()) return this.set(value)

            const cls       = this.constructor as ImmutableConstructor

            return cls.new(this.nextConfig(value)) as this
        }
    }

    return Immutable
}

export type Immutable               = Mixin<typeof Immutable>
export type ImmutableConstructor    = MixinConstructor<typeof Immutable>

export const MinimalImmutable       = Immutable(Writable(Readable(Atom(Base))))


//---------------------------------------------------------------------------------------------------------------------
export const MutableBoxWithCandidate = <T extends Constructable<MutableBox>>(base : T) =>

class MutableBoxWithCandidate extends base {
    // candidate for `next`
    candidate       : Immutable


    getCandidate () : this['candidate'] {
        return this.candidate || (this.candidate = this.value.next(undefined))
    }


    commit () {
        const candidate         = this.getCandidate()

        if (candidate.hasValue()) {
            this.candidate      = null

            super.set(candidate)
        }
    }


    reject () {
        this.candidate          = null
    }
}

export type MutableBoxWithCandidate = Mixin<typeof MutableBoxWithCandidate>









// //---------------------------------------------------------------------------------------------------------------------
// export const Versioned = <T extends Constructable<Reference & HasId>>(base: T) => {
//
//     abstract class VersionedReference extends base {
//         version: ChronoId = chronoId()
//     }
//
//     return VersionedReference
// }
//
// export type VersionedReference = Mixin<typeof VersionedReference>
