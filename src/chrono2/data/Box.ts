import { AnyConstructor, Mixin } from "../../class/Mixin.js"
import { Immutable, Owner } from "./Immutable.js"


//---------------------------------------------------------------------------------------------------------------------
export class BoxImmutable<V> implements Immutable {
    //region ChronoBoxImmutable as Immutable
    previous            : this              = undefined

    frozen              : boolean           = false

    owner               : Owner<this> & Box<V> = undefined


    freeze () {
        this.frozen = true
    }


    createNext () : this {
        this.freeze()

        const self      = this.constructor as AnyConstructor<this, typeof BoxImmutable>
        const next      = new self()

        next.previous   = this
        next.owner      = this.owner

        return next
    }
    //endregion


    //region ChronoBox's own interface
    value               : V                 = undefined


    read () : V {
        return this.readValuePure()
    }


    readValuePure () : V {
        let box : this = this

        while (box) {
            if (box.value !== undefined) return box.value

            box     = box.previous
        }

        return null
    }


    write (value : V) {
        if (this.frozen) {
            const next = this.createNext()

            this.owner.setCurrent(next)

            next.writeToUnfrozen(value)
        } else {
            this.writeToUnfrozen(value)
        }
    }


    writeToUnfrozen (value : V) {
        if (value === undefined) value = null

        this.value  = value
    }
    //endregion
}


//---------------------------------------------------------------------------------------------------------------------
export class Box<V> extends BoxImmutable<V> implements Owner<BoxImmutable<V>> {
    //region ChronoBox as Owner
    immutable       : BoxImmutable<V>        = this


    setCurrent (immutable : BoxImmutable<V>) {
        if (immutable.previous !== this.immutable) throw new Error("Invalid state thread")

        this.immutable = immutable
    }
    //endregion


    //region ChronoBoxOwner as ChronoBoxImmutable interface

    owner           : Owner<this> & Box<V> = this as any

    createNext () : this {
        this.freeze()

        const self      = this.constructor as AnyConstructor<this, typeof Box>
        const next      = new self.immutableCls()

        next.previous   = this
        next.owner      = this

        return next as this
    }

    static immutableCls : AnyConstructor<BoxImmutable<unknown>, typeof BoxImmutable> = BoxImmutable
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
