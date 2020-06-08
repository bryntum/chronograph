import { AnyConstructor } from "../../class/Mixin.js"
import { CalculationFunction, CalculationMode } from "../CalculationMode.js"
import { globalContext } from "../GlobalContext.js"
import { defaultMetaSync, Meta } from "../Meta.js"
import { AtomState } from "../Quark.js"
import { Box } from "./Box.js"


//---------------------------------------------------------------------------------------------------------------------
export class CalculableBox extends Box {

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

    static meta : Meta     = defaultMetaSync


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


    proposedValue           : unknown   = undefined


    read () : any {
        if (globalContext.activeQuark) this.immutableForWrite().addOutgoing(globalContext.activeQuark)

        if (this.state === AtomState.UpToDate) return this.immutable.read()

        this.calculate()

        return this.immutable.read()
    }


    updateValue (newValue : unknown) {
        if (newValue === undefined) newValue = null

        const oldValue              = this.immutable.read()

        this.immutableForWrite().write(newValue)
        this.state                  = AtomState.UpToDate

        if (!this.equality(oldValue, newValue)) this.propagateStale()
    }


    calculate () {
        const incoming  = this.immutable.$incoming

        if (incoming) {
            for (let i = 0; i < incoming.length; i++) {
                const dependencyAtom        = incoming[ i ].owner as Box

                const prevActive            = globalContext.activeQuark
                globalContext.activeQuark   = null

                if (dependencyAtom.state !== AtomState.UpToDate) dependencyAtom.read()

                globalContext.activeQuark   = prevActive
            }

            if (this.state !== AtomState.Stale) {
                this.state = AtomState.UpToDate
                return
            }
        }

        this.doCalculate()
    }


    doCalculate () {
        this.immutableForWrite().$incoming = undefined

        const prevActive            = globalContext.activeQuark
        globalContext.activeQuark   = this.immutable

        const newValue              = this.calculation.call(this.context)

        globalContext.activeQuark   = prevActive

        this.updateValue(newValue)
    }


    write (value : unknown) {
        if (value === undefined) value = null

        // ignore the write of the same value? what about `keepIfPossible` => `pin`
        if (this.proposedValue === undefined && this.equality(this.immutable.read(), value)) return

        this.proposedValue  = value

        if (this.state === AtomState.UpToDate) {
            this.state  = AtomState.PossiblyStale

            this.propagatePossiblyStale()
        }
    }
}
