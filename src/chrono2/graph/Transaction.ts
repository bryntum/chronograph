import { AnyConstructor } from "../../class/Mixin.js"
import { Quark } from "../atom/Quark.js"
import { Immutable, Owner } from "../data/Immutable.js"
import { ChronoGraph } from "./Graph.js"
import { Iteration, ZeroIteration } from "./Iteration.js"


//----------------------------------------------------------------------------------------------------------------------
export class Transaction extends Owner implements Immutable {

    refCount        : number            = 0


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

            next.immutable  = immutable

            this.owner.setCurrent(next)
        } else {
            this.immutable  = immutable
        }
    }
    //endregion

    //region transaction as Immutable
    owner       : ChronoGraph           = undefined

    previous    : this                  = undefined

    frozen      : boolean               = false


    createNext (owner? : ChronoGraph) : this {
        this.freeze()

        const self      = this.constructor as AnyConstructor<this, typeof Transaction>
        const next      = self.new()

        next.previous   = this
        next.owner      = owner || this.owner

        next.immutable.previous = this.immutable

        return next
    }


    freeze () {
        if (this.frozen) return

        this.immutable.freeze()

        this.frozen = true
    }
    //endregion


    forEveryIteration (func : (iteration : Iteration) => any) {
        let iteration       = this.immutable

        const stopAt        = this.previous ? this.previous.immutable : undefined

        while (iteration && iteration !== stopAt) {
            func(iteration)

            iteration      = iteration.previous
        }
    }


    mark () {
        this.refCount++

        this.forEveryIteration(iteration => iteration.mark())
    }


    unmark () {
        this.refCount--

        this.forEveryIteration(iteration => iteration.unmark())
    }


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

export const ZeroTransaction = new Transaction()

ZeroTransaction.immutable   = ZeroIteration
ZeroIteration.owner         = ZeroTransaction

ZeroTransaction.freeze()
