import { AnyConstructor } from "../class/Mixin.js"
import { Immutable, Owner } from "./Immutable.js"


//---------------------------------------------------------------------------------------------------------------------
export class ChronoBox<V> implements Immutable, Owner<ChronoBox<V>> {
    //region ChronoBox as Immutable
    previous            : this              = undefined

    frozen              : boolean           = false
    isOwner             : boolean           = true

    owner               : Owner<this> & ChronoBox<V> = undefined


    freeze () {
        this.frozen = true
    }


    createNext () : this {
        this.freeze()

        const self      = this.constructor as AnyConstructor<this, typeof ChronoBox>
        const next      = new self()

        next.immutable  = undefined
        next.previous   = this
        next.owner      = this.owner

        return next
    }
    //endregion


    //region ChronoBox as Owner
    immutable : ChronoBox<V>        = this

    setCurrent (immutable : ChronoBox<V>) {
        if (immutable.previous !== this.immutable) throw new Error("Invalid state thread")

        this.immutable = immutable
    }
    //endregion


    //region ChronoBox's own interface
    value               : V                 = undefined


    read () : V {
        if (this.immutable && this.immutable !== this) return this.immutable.read()

        if (this.value !== undefined) {
            return this.value
        }

        if (this.previous !== undefined) return this.previous.read()

        return null
    }


    write (value : V) {
        if (this.immutable && this.immutable !== this) return this.immutable.write(value)

        if (value === undefined) value = null

        if (this.frozen) {
            const next = this.createNext()

            this.owner.setCurrent(next)

            next.write(value)
        } else {
            this.value  = value
        }
    }
    //endregion
}
