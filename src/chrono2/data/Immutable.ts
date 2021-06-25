import { AnyConstructor, Mixin } from "../../class/Mixin.js"
import { DefaultMetaSync, Meta } from "../atom/Meta.js"
import { CalculationFunction, CalculationMode } from "../CalculationMode.js"


//---------------------------------------------------------------------------------------------------------------------
export class Immutable {
    owner       : Owner         = undefined

    previous    : this          = undefined

    frozen      : boolean       = false


    freeze () {
        this.frozen = true
    }


    createNext (owner? : Owner) : this {
        this.freeze()

        const self      = this.constructor as AnyConstructor<this, typeof Immutable>
        const next      = new self()

        next.previous   = this
        next.owner      = owner || this.owner

        return next
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class Owner {
    immutable   : Immutable     = undefined


    setCurrent (immutable : this[ 'immutable' ]) {
        if (this.immutable && immutable && immutable.previous !== this.immutable) throw new Error("Invalid state thread")

        this.immutable = immutable
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class CombinedOwnerAndImmutable extends Immutable implements Owner {
    owner           : Owner         = this


    createNext () : this {
        this.freeze()

        const self      = this.constructor as AnyConstructor<this, typeof CombinedOwnerAndImmutable>
        const next      = new self.immutableCls()

        next.previous   = this
        next.owner      = this

        return next as this
    }


    immutable       : Immutable         = this

    setCurrent (immutable : this[ 'immutable' ]) {
        if (this.immutable && immutable && immutable.previous !== this.immutable) throw new Error("Invalid state thread")

        this.immutable = immutable
    }

    static immutableCls : AnyConstructor<Immutable, typeof Immutable> = Immutable
}

