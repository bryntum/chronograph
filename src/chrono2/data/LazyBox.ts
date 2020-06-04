import { AnyConstructor } from "../../class/Mixin.js"
import { BoxImmutable } from "./Box.js"
import { Owner } from "./Immutable.js"


//---------------------------------------------------------------------------------------------------------------------
export class LazyBoxImmutable<V> extends BoxImmutable<V> {
    owner               : Owner<this> & LazyBox<V> = undefined

    read () : V {
        if (this.frozen) return this.readValuePure()

        if (this.value !== undefined) return this.value

        // note, that call to `this.readValuePure()` during `calculateValue`
        // will return previous value
        let value : V = this.calculation()

        if (value === undefined) value = null

        return this.value = value
    }


    calculation () : V {
        throw new Error("Abstract method called")
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class LazyBox<V> extends LazyBoxImmutable<V> implements Owner<LazyBoxImmutable<V>> {
    //region ChronoBox as Owner
    immutable       : LazyBoxImmutable<V>        = this


    setCurrent (immutable : LazyBoxImmutable<V>) {
        if (immutable.previous !== this.immutable) throw new Error("Invalid state thread")

        this.immutable = immutable
    }
    //endregion


    //region ChronoBoxOwner as ChronoBoxImmutable interface

    owner           : Owner<this> & LazyBox<V> = this as any

    createNext () : this {
        this.freeze()

        const self      = this.constructor as AnyConstructor<this, typeof LazyBox>
        const next      = new self.immutableCls()

        next.previous   = this
        next.owner      = this

        return next as this
    }

    static immutableCls : AnyConstructor<LazyBoxImmutable<unknown>, typeof LazyBoxImmutable> = LazyBoxImmutable
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
