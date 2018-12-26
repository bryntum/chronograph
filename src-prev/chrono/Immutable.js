import { Base } from "../class/Mixin.js";
import { Atom, Readable, Writable } from "./Atom.js";
//---------------------------------------------------------------------------------------------------------------------
export const Immutable = (base) => {
    class Immutable extends base {
        getPrevious() {
            return this.previous;
        }
        set(value) {
            if (this.hasValue()) {
                return this.next(value);
            }
            else {
                return super.set(value);
            }
        }
        nextConfig(value) {
            return (value !== undefined ? {
                previous: this,
                value: value
            } : {
                previous: this
            }); // wtf, TODO submit a bug about this
        }
        next(value) {
            if (!this.hasValue())
                return this.set(value);
            const cls = this.constructor;
            return cls.new(this.nextConfig(value));
        }
    }
    return Immutable;
};
export const MinimalImmutable = Immutable(Writable(Readable(Atom(Base))));
// export const MinimalDelegatedImmutable  = Immutable(DelegatedStorage(Writable(Readable(Atom(Base)))))
//---------------------------------------------------------------------------------------------------------------------
export const MutableBoxWithCandidate = (base) => class MutableBoxWithCandidate extends base {
    getCandidate() {
        return this.candidate || (this.candidate = this.value.next(undefined));
    }
    commit() {
        const candidate = this.getCandidate();
        if (candidate.hasValue()) {
            this.candidate = null;
            super.set(candidate);
        }
    }
    reject() {
        this.candidate = null;
    }
};
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
