import { AnyConstructor } from "../../class/Mixin.js"
import { Iteration } from "./Iteration.js"
import { Immutable, Owner } from "../data/Immutable.js"
import { ChronoGraph } from "./Graph.js"
import { Quark } from "../atom/Quark.js"


//----------------------------------------------------------------------------------------------------------------------
export class Transaction extends Owner implements Immutable {
    //region Transaction as Owner
    $immutable      : Iteration       = undefined

    get immutable () : Iteration {
        if (this.$immutable !== undefined) return this.$immutable

        return this.$immutable = Iteration.new({ owner : this, previous : this.previous ? this.previous.immutable : undefined })
    }

    set immutable (value : Iteration) {
        this.$immutable = value
    }


    setCurrent (immutable : Iteration) {
        if (this.$immutable && immutable.previous !== this.immutable) throw new Error("Invalid state thread")

        if (this.frozen) {
            const next = this.createNext()

            this.owner.setCurrent(next)

            next.immutable  = immutable
        } else {
            this.immutable  = immutable
        }
    }
    //endregion

    //region transaction as Immutable
    owner       : ChronoGraph           = undefined

    previous    : this                  = undefined

    frozen      : boolean               = false


    createNext () : this {
        this.freeze()

        const self      = this.constructor as AnyConstructor<this, typeof Transaction>
        const next      = self.new()

        next.previous   = this
        next.owner      = this.owner

        next.immutable.previous = this.immutable

        return next
    }


    freeze () {
        if (this.frozen) return

        this.immutable.freeze()

        this.frozen = true
    }
    //endregion


    immutableForWrite () : this[ 'immutable' ] {
        if (this.immutable.frozen) this.setCurrent(this.immutable.createNext())

        return this.immutable
    }


    addQuark (quark : Quark) {
        this.immutableForWrite().addQuark(quark)
    }


    static new<T extends typeof Transaction> (this : T, props? : Partial<InstanceType<T>>) : InstanceType<T> {
        const instance      = new this()

        Object.assign(instance, props)

        return instance as InstanceType<T>
    }
}
