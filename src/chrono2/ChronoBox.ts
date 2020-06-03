import { AnyConstructor } from "../class/Mixin.js"
import { Immutable, Owner } from "./Immutable.js"


//---------------------------------------------------------------------------------------------------------------------
export class ChronoBoxImmutable<V> implements Immutable {
    //region ChronoBoxImmutable as Immutable
    previous            : this              = undefined

    frozen              : boolean           = false

    owner               : Owner<this> & ChronoBoxOwner<V> = undefined


    freeze () {
        this.frozen = true
    }


    createNext () : this {
        this.freeze()

        const self      = this.constructor as AnyConstructor<this, typeof ChronoBoxImmutable>
        const next      = new self()

        next.previous   = this
        next.owner      = this.owner

        return next
    }
    //endregion


    //region ChronoBox's own interface
    value               : V                 = undefined


    read () : V {
        if (this.value !== undefined) return this.value

        if (this.previous !== undefined) return this.previous.read()

        return null
    }


    write (value : V) {
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



//---------------------------------------------------------------------------------------------------------------------
export class ChronoBoxOwner<V> extends ChronoBoxImmutable<V> implements Owner<ChronoBoxImmutable<V>> {
    //region ChronoBox as Owner
    immutable       : ChronoBoxImmutable<V>        = this


    setCurrent (immutable : ChronoBoxImmutable<V>) {
        if (immutable.previous !== this.immutable) throw new Error("Invalid state thread")

        this.immutable = immutable
    }
    //endregion


    //region ChronoBoxOwner as ChronoBoxImmutable interface

    // @ts-ignore
    owner           : Owner<this> & ChronoBoxOwner<V> = this

    createNext () : this {
        this.freeze()

        const self      = this.constructor as AnyConstructor<this, typeof ChronoBoxOwner>
        const next      = new self.immutableCls()

        next.previous   = this
        next.owner      = this

        // @ts-ignore
        return next
    }

    static immutableCls : AnyConstructor<ChronoBoxImmutable<unknown>, typeof ChronoBoxImmutable> = ChronoBoxImmutable
    //endregion


    //region ChronoBoxOwner as both ChronoBoxOwner & ChronoBoxImmutable interface

    read () : V {
        if (this.immutable === this) return super.read()

        return this.immutable.read()
    }


    write (value : V) {
        if (this.immutable === this) return super.write(value)

        return this.immutable.write(value)
    }
    //endregion
}
