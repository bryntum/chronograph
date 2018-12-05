import {ChronoValue, MinimalRWAtom} from "../chrono/Atom.js";
import {Constructable, Mixin} from "../class/Mixin.js";
import {Immutable, ImmutableConstructor, MinimalImmutable} from "./Immutable.js";
import {Reference} from "./Reference.js";


//---------------------------------------------------------------------------------------------------------------------
export const MutableBox = <T extends Constructable<Reference>>(base: T) => {

    abstract class MutableBox extends base {
        cls             : ImmutableConstructor  = MinimalImmutable

        value           : Immutable

        value$          : ChronoValue


        initialize () {
            super.initialize(...arguments)

            if (this.value$) this.set(this.value$)
        }


        get () {
            return this.hasValue() ? this.value.get() : undefined
        }


        set (value : ChronoValue) : this {
            if (this.hasValue()) {
                const referencedNode    = this.value

                const nextNode          = referencedNode.next(value)

                return super.set(nextNode)
            } else {
                return super.set(this.initialAtom(value))
            }
        }


        getPrevious () {
            if (this.hasValue()) {
                return this.value.previous
            } else {
                return undefined
            }
        }


        initialAtomConfig (value : ChronoValue) : Partial<Immutable> {
            return {
                value       : value
            }
        }


        initialAtom (value : ChronoValue) : Immutable {
            const cls       = this.cls

            return cls.new(this.initialAtomConfig(value))
        }

    }

    return MutableBox
}

export type MutableBox = Mixin<typeof MutableBox>


export const MinimalMutableBox = MutableBox(Reference(MinimalRWAtom))
