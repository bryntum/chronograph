import { AnyConstructor, Mixin } from "../../class/Mixin.js"
import { CalculationFunction, CalculationMode } from "../CalculationMode.js"
import { globalContext } from "../GlobalContext.js"
import { defaultMeta, Meta } from "../Meta.js"
import { QuarkState } from "../Quark.js"
import { Box, BoxImmutable } from "./Box.js"
import { CombinedOwnerAndImmutable, OwnerManaged } from "./Immutable.js"


//---------------------------------------------------------------------------------------------------------------------
export class CalculableBoxImmutable extends Mixin(
    [ BoxImmutable ],
    (base : AnyConstructor<BoxImmutable, typeof BoxImmutable>) =>

    class CalculableBoxImmutable extends base {
        proposedValue       : unknown             = undefined

        owner               : OwnerManaged


        createNext () : this {
            const next  = super.createNext()

            if (this.state === QuarkState.Stale) {
                next.proposedValue  = this.proposedValue
            }

            return next
        }


        read () : unknown {
            if (globalContext.activeQuark) this.addOutgoing(globalContext.activeQuark)

            if (this.frozen) return this.readValuePure()

            if (this.state === QuarkState.UpToDate && this.value !== undefined) return this.value

            this.calculate()

            return this.value
        }


        updateValue (newValue : unknown) {
            if (newValue === undefined) newValue = null

            const oldValue              = this.readValuePure()

            this.value                  = newValue
            this.state                  = QuarkState.UpToDate

            if (!this.equality(oldValue, newValue)) this.propagateStale()
        }


        calculate () {
            const calculationContext    = this.calculationContext
            const calculation           = this.calculation

            const prevActive            = globalContext.activeQuark
            globalContext.activeQuark   = this

            this.$incoming              = undefined

            const newValue              = calculation.call(calculationContext)

            globalContext.activeQuark   = prevActive

            this.updateValue(newValue)
        }


        writeToUnfrozen (value : unknown) {
            if (value === undefined) value = null

            // ignore the write of the same value? what about `keepIfPossible` => `pin`
            if (this.proposedValue === undefined && this.equality(this.readValuePure(), value)) return

            this.proposedValue  = value

            if (this.state === QuarkState.UpToDate) {
                this.state  = QuarkState.PossiblyStale

                this.propagatePossiblyStale()
            }
        }


        get equality () : (v1 : unknown, v2 : unknown) => boolean {
            return this.owner.equality
        }

        get calculation () : CalculationFunction<unknown, CalculationMode> {
            return this.owner.calculation
        }

        get calculationContext () : unknown {
            return this.owner.context
        }
    }
){}


//---------------------------------------------------------------------------------------------------------------------
export class CalculableBox extends Mixin(
    [ CalculableBoxImmutable, Box ],
    (base : AnyConstructor<CalculableBoxImmutable & Box, typeof CalculableBoxImmutable & typeof Box>) =>

    class CalculableBox extends base {
        //@ts-ignore
        immutable       : CalculableBoxImmutable

        constructor (config : Partial<CalculableBox>) {
            super()

            if (config) {
                this.calculation    = config.calculation
                this.context        = config.context || this
            }
        }


        get meta () : Meta {
            const cls = this.constructor as AnyConstructor<this, typeof CalculableBox>

            return cls.meta as Meta
        }


        static meta : Meta     = defaultMeta


        context     : unknown           = undefined


        $calculation : CalculationFunction<unknown, CalculationMode>      = undefined

        get calculation () : CalculationFunction<unknown, CalculationMode> {
            if (this.$calculation !== undefined) return this.$calculation

            return this.meta.calculation
        }
        set calculation (value : CalculationFunction<unknown, CalculationMode>) {
            this.$calculation = value
        }


        $equality       : (v1 : unknown, v2 : unknown) => boolean   = undefined

        get equality () : (v1 : unknown, v2 : unknown) => boolean {
            if (this.$equality !== undefined) return this.$equality

            return this.meta.equality
        }
        set equality (value : (v1 : unknown, v2 : unknown) => boolean) {
            this.$equality = value
        }


        static immutableCls : AnyConstructor<CalculableBoxImmutable, typeof CalculableBoxImmutable> = CalculableBoxImmutable


        // read () : any {
        //     if (this.immutable === this) return super.read()
        //
        //     return this.immutable.read()
        // }
        //
        //
        // write (value : unknown) {
        //     if (this.immutable === this) return super.write(value)
        //
        //     return this.immutable.write(value)
        // }
    }
){}
