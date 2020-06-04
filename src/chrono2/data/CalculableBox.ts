import { AnyConstructor } from "../../class/Mixin.js"
import { CalculationFunction, CalculationMode, CalculationModeSync } from "../CalculationMode.js"
import { defaultMeta, Meta } from "../Meta.js"
import { BoxImmutable } from "./Box.js"
import { Owner, OwnerManaged } from "./Immutable.js"


//---------------------------------------------------------------------------------------------------------------------
export class CalculableBoxImmutable<V, Mode extends CalculationMode = CalculationModeSync>
    extends BoxImmutable<V>
{
    owner               : Owner<this> & CalculableBox<V, Mode> = undefined

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

    get calculation () : CalculationFunction<V, Mode> {
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
export class CalculableBox<V, Mode extends CalculationMode = CalculationModeSync>
    extends CalculableBoxImmutable<V, Mode>
    implements OwnerManaged<CalculableBoxImmutable<V, Mode>>
{

    constructor (config : Partial<CalculableBox<V, Mode>>) {
        super()

        if (config) {
            this.calculation    = config.calculation
            this.context        = config.context || this
        }
    }


    get meta () : Meta<V, Mode> {
        const cls = this.constructor as AnyConstructor<this, typeof CalculableBox>

        return cls.meta as Meta<V, Mode>
    }


    static meta : Meta<unknown>     = defaultMeta


    context     : unknown           = undefined


    $calculation : CalculationFunction<V, Mode>      = undefined

    get calculation () : CalculationFunction<V, Mode> {
        if (this.$calculation !== undefined) return this.$calculation

        return this.meta.calculation
    }
    set calculation (value : CalculationFunction<V, Mode>) {
        this.$calculation = value
    }





    // //region ChronoBox as Owner
    immutable       : CalculableBoxImmutable<V, Mode>        = this

    // proposedValue           : V             = undefined


    setCurrent (immutable : CalculableBoxImmutable<V, Mode>) {
        if (immutable.previous !== this.immutable) throw new Error("Invalid state thread")

        this.immutable = immutable
    }


    // get effectHandler () : EffectHandler<CalculationModeUnknown, any> {
    //     return
    // }

    //endregion


    //region ChronoBoxOwner as ChronoBoxImmutable interface

    owner           : Owner<this> & CalculableBox<V, Mode> = this as any

    createNext () : this {
        this.freeze()

        const self      = this.constructor as AnyConstructor<this, typeof CalculableBox>
        const next      = new self.immutableCls() as this

        next.previous   = this
        next.owner      = this as any

        // @ts-ignore
        return next
    }

    static immutableCls : AnyConstructor<CalculableBoxImmutable<unknown, CalculationMode>, typeof CalculableBoxImmutable> = CalculableBoxImmutable
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
