import { AnyConstructor, Mixin } from "../../class/Mixin.js"
import { CalculationFunction, CalculationMode } from "../CalculationMode.js"
import { ChronoId } from "../Identifiable.js"
import { defaultMeta, Meta } from "../Meta.js"

//---------------------------------------------------------------------------------------------------------------------
export interface GarbageCollectable {
    refCount    : number

    destroy ()
}


//---------------------------------------------------------------------------------------------------------------------
export class Immutable extends Mixin(
    [],
    (base : AnyConstructor) =>

    class Immutable extends base {
        owner       : Owner         = undefined

        previous    : this          = undefined

        frozen      : boolean       = false


        freeze () {
            this.frozen = true
        }

        createNext () : this {
            this.freeze()

            const self      = this.constructor as AnyConstructor<this, typeof Immutable>
            const next      = new self()

            next.previous   = this
            next.owner      = this.owner

            return next
        }
    }
){}


//---------------------------------------------------------------------------------------------------------------------
export class Owner extends Mixin(
    [],
    (base : AnyConstructor) =>

    class Owner extends base {
        immutable   : Immutable     = undefined


        setCurrent (immutable : Immutable) {
            if (this.immutable && immutable && immutable.previous !== this.immutable) throw new Error("Invalid state thread")

            this.immutable = immutable
        }
    }
){}


//---------------------------------------------------------------------------------------------------------------------
export class CombinedOwnerAndImmutable extends Mixin(
    [ Owner, Immutable ],
    (base : AnyConstructor<Owner & Immutable, typeof Owner & typeof Immutable>) =>

    class CombinedOwnerAndImmutable extends base {
        immutable       : Immutable         = this

        owner           : Owner             = this as any

        createNext () : this {
            this.freeze()

            const self      = this.constructor as AnyConstructor<this, typeof CombinedOwnerAndImmutable>
            const next      = new self.immutableCls()

            next.previous   = this
            next.owner      = this

            return next as this
        }

        static immutableCls : AnyConstructor<Immutable, typeof Immutable> = Immutable
    }
){}


//---------------------------------------------------------------------------------------------------------------------
export class OwnerManaged extends Mixin(
    [ Owner ],
    (base : AnyConstructor<Owner, typeof Owner>) =>

    class Owner extends base {
        context     : unknown           = undefined

        $calculation : CalculationFunction<unknown, CalculationMode>      = undefined
        $equality : (v1 : unknown, v2 : unknown) => boolean               = undefined

        get meta () : Meta {
            const cls = this.constructor as AnyConstructor<this, typeof OwnerManaged>

            return cls.meta as Meta
        }


        get calculation () : CalculationFunction<unknown, CalculationMode> {
            if (this.$calculation !== undefined) return this.$calculation

            // IIRC should return the value from meta, not caching on itself - seems
            // this is treated by V8 as another function
            return this.meta.calculation
        }
        set calculation (value : CalculationFunction<unknown, CalculationMode>) {
            this.$calculation = value
        }


        get equality () : (v1 : unknown, v2 : unknown) => boolean {
            if (this.$equality !== undefined) return this.$equality

            // IIRC should return the value from meta, not caching on itself - seems
            // this is treated by V8 as another function
            return this.meta.equality
        }
        set equality (value : (v1 : unknown, v2 : unknown) => boolean) {
            this.$equality = value
        }

        static meta : Meta              = defaultMeta
    }
){}
