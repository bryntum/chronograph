import { AnyConstructor } from "../../class/Mixin.js"
import { CalculationFunction, CalculationMode } from "../CalculationMode.js"
import { globalContext } from "../GlobalContext.js"
import { DefaultMetaSync, Meta } from "../Meta.js"
import { AtomState } from "../Quark.js"
import { Box } from "./Box.js"


//---------------------------------------------------------------------------------------------------------------------
export class CalculableBox<V> extends Box<V> {

    constructor (config? : Partial<CalculableBox<V>>) {
        super()

        if (config) {
            this.context        = config.context || this

            this.calculation    = config.calculation
            this.equality       = config.equality
            this.lazy           = config.lazy
            this.sync           = config.sync
        }
    }

    $meta   : Meta      = undefined

    get meta () : Meta {
        if (this.$meta !== undefined) return this.$meta

        const cls = this.constructor as AnyConstructor<this, typeof CalculableBox>

        return this.$meta = cls.meta
    }

    set meta (value : Meta) {
        this.$meta  = value
    }

    static meta : Meta     = DefaultMetaSync


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


    $lazy : boolean      = undefined

    get lazy () : boolean {
        if (this.$lazy !== undefined) return this.$lazy

        return this.meta.lazy
    }
    set lazy (value : boolean) {
        this.$lazy = value
    }


    $sync : boolean      = undefined

    get sync () : boolean {
        if (this.$sync !== undefined) return this.$sync

        return this.meta.sync
    }
    set sync (value : boolean) {
        this.$sync = value
    }


    proposedValue           : unknown   = undefined


    readProposedOrPrevious () {
        // if (globalContext.activeQuark) this.immutableForWrite().getIncoming().push(invalidatingBoxImmutable)

        if (globalContext.activeQuark === this.immutable) {
            // this.usedProposedOrPrevious = true
            // this.immutableForWrite().getIncoming().push(invalidatingBoxImmutable)

            this.immutableForWrite().usedProposedOrPrevious = true
        }

        if (this.proposedValue !== undefined) return this.proposedValue

        return this.readPrevious()
    }


    readPrevious () : any {
        if (this.state === AtomState.UpToDate)
            return this.immutable.previous ? this.immutable.previous.read() : undefined
        else
            // TODO should return `undefined` for non-previous case - `read` always returns `null`
            return this.immutable.read()
    }


    read () : any {
        if (this.graph) this.actualize()

        if (globalContext.activeQuark) this.immutableForWrite().addOutgoing(globalContext.activeQuark)

        if (this.state === AtomState.UpToDate) return this.immutable.read()

        this.calculate()

        return this.immutable.read()
    }


    updateValue (newValue : unknown) {
        if (newValue === undefined) newValue = null

        const oldValue              = this.immutable.read()

        this.immutableForWrite().write(newValue)

        if (this.immutable.usedProposedOrPrevious) {
            this.state              = this.equality(newValue, this.proposedValue) ? AtomState.UpToDate : AtomState.Stale
        } else {
            this.state              = AtomState.UpToDate
        }

        this.proposedValue          = undefined

        if (!this.equality(oldValue, newValue)) this.propagateStale()
    }


    calculate () {
        if (this.shouldCalculate())
            this.doCalculate()
        else
            this.state = AtomState.UpToDate
    }


    shouldCalculate () {
        if (this.state === AtomState.Stale) return true

        if (this.immutable.usedProposedOrPrevious && this.proposedValue !== undefined) return true

        const incoming  = this.immutable.$incoming

        if (incoming) {
            for (let i = 0; i < incoming.length; i++) {
                const dependency            = incoming[ i ]

                const dependencyAtom        = dependency.owner as Box<V>

                const prevActive            = globalContext.activeQuark
                globalContext.activeQuark   = null

                if (dependencyAtom.state !== AtomState.UpToDate) dependencyAtom.read()

                globalContext.activeQuark   = prevActive

                // TODO check in 3.9, 4.0, looks like a bug in TS
                //@ts-ignore
                if (this.state === AtomState.Stale) return true
            }
        }

        return false
    }


    doCalculate () {
        this.immutableForWrite().$incoming              = undefined
        this.immutableForWrite().usedProposedOrPrevious = false

        const prevActive            = globalContext.activeQuark
        globalContext.activeQuark   = this.immutable

        const newValue              = this.calculation.call(this.context)

        globalContext.activeQuark   = prevActive

        this.updateValue(newValue)
    }


    write (value : unknown) {
        if (value === undefined) value = null

        // // ignore the write of the same value? what about `keepIfPossible` => `pin`
        // if (this.proposedValue === undefined && this.equality(this.immutable.read(), value)) return

        if (this.proposedValue === undefined) {
            // still update the `proposedValue` to indicate the user input?
            this.proposedValue  = value

            // ignore the write of the same value? what about `keepIfPossible` => `pin`
            if (this.equality(this.immutable.read(), value)) return

            // this.proposedValueState = AtomState.UpToDate
        } else {
            const valueToCompareWith = this.proposedValue

            if (this.equality(valueToCompareWith, value)) return

            // this.proposedValueState = AtomState.Stale
        }


        this.proposedValue  = value

        if (this.state === AtomState.UpToDate) {
            this.state  = AtomState.PossiblyStale

            this.propagatePossiblyStale()
        }
    }
}
