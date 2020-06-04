import { AnyConstructor, AnyFunction } from "../../class/Mixin.js"
import { CalculationModeSync, CalculationModeUnknown } from "../CalculationMode.js"
import { EffectHandler } from "../Effect.js"
import { globalContext } from "../GlobalContext.js"
import { Meta } from "../Meta.js"
import { BoxImmutable } from "./Box.js"
import { Owner, OwnerManaged } from "./Immutable.js"


//---------------------------------------------------------------------------------------------------------------------
export class CalculableBoxImmutable<V> extends BoxImmutable<V> {
    owner               : Owner<this> & CalculableBox<V> = undefined

    proposedValue       : V             = undefined

    dirty               : boolean       = false


    createNext () : this {
        const next  = super.createNext()

        if (this.dirty) {
            next.proposedValue  = this.proposedValue
            next.dirty          = true
        }

        return next
    }


    read () : V {
        if (this.frozen) return this.readValuePure()

        if (!this.dirty && this.value !== undefined) return this.value

        let value : V = this.calculation.call(this.calculationContext)

        if (value === undefined) value = null

        this.value = value
        this.dirty = false

        return value
    }


    writeToUnfrozen (value : V) {
        if (value === undefined) value = null

        // ignore write of the same value
        if (this.equality(this.readValuePure(), value)) return

        this.proposedValue  = value
        this.dirty          = true
    }


    get equality () : (v1 : V, v2 : V) => boolean {
        return this.owner.meta.equality
    }

    get calculation () : AnyFunction {
        return this.owner.calculation
    }

    get calculationContext () : unknown {
        return this.owner.context
    }

    calculationProposed () : V {
        throw new Error("Abstract method called")
    }

}



//---------------------------------------------------------------------------------------------------------------------
export class CalculableBox<V, Ctx extends CalculationModeUnknown = CalculationModeSync> extends CalculableBoxImmutable<V> implements OwnerManaged<CalculableBoxImmutable<V>> {

    constructor (config : Partial<CalculableBox<V>>) {
        super()

        if (config) {
            this.calculation    = config.calculation
            this.context        = config.context || this
        }
    }


    get meta () : Meta<V> {
        const cls = this.constructor as AnyConstructor<this, typeof CalculableBox>

        return cls.meta as Meta<V>
    }


    static meta : Meta<unknown>     = undefined


    context     : unknown           = undefined


    $calculation : AnyFunction      = undefined

    get calculation () : AnyFunction {
        if (this.$calculation !== undefined) return this.$calculation

        return this.meta.calculation
    }
    set calculation (value : AnyFunction) {
        this.$calculation = value
    }





    // //region ChronoBox as Owner
    immutable       : CalculableBoxImmutable<V>        = this

    // proposedValue           : V             = undefined


    setCurrent (immutable : CalculableBoxImmutable<V>) {
        if (immutable.previous !== this.immutable) throw new Error("Invalid state thread")

        this.immutable = immutable
    }


    // get effectHandler () : EffectHandler<CalculationModeUnknown, any> {
    //     return
    // }

    //endregion


    //region ChronoBoxOwner as ChronoBoxImmutable interface

    // @ts-ignore
    owner           : Owner<this> & CalculableBox<V> = this

    createNext () : this {
        this.freeze()

        const self      = this.constructor as AnyConstructor<this, typeof CalculableBox>
        const next      = new self.immutableCls()

        next.previous   = this
        next.owner      = this

        // @ts-ignore
        return next
    }

    static immutableCls : AnyConstructor<CalculableBoxImmutable<unknown>, typeof CalculableBoxImmutable> = CalculableBoxImmutable
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
