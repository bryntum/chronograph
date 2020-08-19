import { AtomState } from "../atom/Atom.js"
import { getNextRevision } from "../atom/Node.js"
import { CalculationFunction, CalculationMode, CalculationModeSync } from "../CalculationMode.js"
import { EffectHandler } from "../Effect.js"
import { globalContext } from "../GlobalContext.js"
import { Box } from "./Box.js"


//---------------------------------------------------------------------------------------------------------------------
export const SynchronousCalculationStarted  = Symbol('SynchronousCalculationStarted')

const calculationStartedConstant : IteratorResult<typeof SynchronousCalculationStarted> =
    { done : false, value : SynchronousCalculationStarted }

const eff = (eff) => undefined

export class CalculableBox<V> extends Box<V> {

    constructor (config? : Partial<CalculableBox<V>>) {
        super()

        if (config) {
            if (config.meta !== undefined) this.meta = config.meta

            this.name           = config.name
            this.context        = config.context !== undefined ? config.context : this

            this.calculation    = config.calculation
            this.equality       = config.equality
            this.lazy           = config.lazy !== undefined ? config.lazy : true
            // TODO not needed explicitly (can defined based on the type of the `calculation` function?
            this.sync           = config.sync
        }
    }

    // $meta   : Meta      = undefined
    //
    // get meta () : Meta {
    //     if (this.$meta !== undefined) return this.$meta
    //
    //     const cls = this.constructor as AnyConstructor<this, typeof CalculableBox>
    //
    //     return this.$meta = cls.meta
    // }
    //
    // set meta (value : Meta) {
    //     this.$meta  = value
    // }
    //
    // static meta : Meta     = DefaultMetaSync


    context     : unknown           = undefined

    $calculation : CalculationFunction<V, CalculationMode>      = undefined

    get calculation () : CalculationFunction<V, CalculationMode> {
        if (this.$calculation !== undefined) return this.$calculation

        return this.meta.calculation as any
    }
    set calculation (value : CalculationFunction<V, CalculationMode>) {
        this.$calculation = value
    }


    // $equality       : (v1 : unknown, v2 : unknown) => boolean   = undefined
    //
    // get equality () : (v1 : unknown, v2 : unknown) => boolean {
    //     if (this.$equality !== undefined) return this.$equality
    //
    //     return this.meta.equality
    // }
    // set equality (value : (v1 : unknown, v2 : unknown) => boolean) {
    //     this.$equality = value
    // }


    // $lazy : boolean      = undefined
    //
    // get lazy () : boolean {
    //     if (this.$lazy !== undefined) return this.$lazy
    //
    //     return this.meta.lazy
    // }
    // set lazy (value : boolean) {
    //     this.$lazy = value
    // }


    $sync : boolean      = undefined

    get sync () : boolean {
        if (this.$sync !== undefined) return this.$sync

        return this.meta.sync
    }
    set sync (value : boolean) {
        this.$sync = value
    }


    iterationResult     : IteratorResult<any>       = undefined


    isCalculationStarted () : boolean {
        return Boolean(this.iterationResult)
    }


    isCalculationCompleted () : boolean {
        return Boolean(this.iterationResult && this.iterationResult.done)
    }


    beforeCalculation () {
        this.immutableForWrite().$incoming      = undefined
        this.immutable.usedProposedOrPrevious   = false

        this.immutable.revision                 = getNextRevision()
    }


    startCalculation (onEffect : EffectHandler<CalculationModeSync>) : IteratorResult<any> {
        this.beforeCalculation()

        // this assignment allows other code to observe, that calculation has started
        this.iterationResult        = calculationStartedConstant

        return this.iterationResult = {
            done    : true,
            value   : this.calculation.call(this.context, onEffect)
        }
    }


    continueCalculation (value : unknown) : IteratorResult<any> {
        throw new Error("Can not continue synchronous calculation")
    }


    resetCalculation () {
        this.iterationResult        = undefined
    }


    proposedValue           : V     = undefined


    onReadingPast () : this {
        const activeAtom    = globalContext.activeAtom
        const self          = this.checkoutSelf()

        if (activeAtom) {
            if (activeAtom === self)
                self.immutableForWrite().usedProposedOrPrevious = true
            else
                self.immutableForWrite().addOutgoing(activeAtom.immutable)
        }

        return self
    }


    readProposedOrPrevious () : V {
        const self          = this.onReadingPast()

        if (self.proposedValue !== undefined) return self.proposedValue

        return self.readPreviousInternal()
    }


    readPrevious () : V {
        const self          = this.onReadingPast()

        return self.readPreviousInternal()
    }


    readPreviousInternal () : V {
        if (this.state === AtomState.UpToDate)
            return this.immutable.previous ? this.immutable.previous.readRaw() : undefined
        else
            return this.immutable.readRaw()
    }


    read () : V {
        const activeAtom    = globalContext.activeAtom
        const self          = this.checkoutSelf()

        if (activeAtom) self.immutableForWrite().addOutgoing(activeAtom.immutable)

        // inlined `actualize` to save 1 stack level
        if (self.state !== AtomState.UpToDate) {
            if (self.shouldCalculate())
                self.doCalculate()
            else
                self.state = AtomState.UpToDate
        }
        // eof inlined `actualize`

        return self.immutable.read()
    }


    actualize () {
        if (this.state !== AtomState.UpToDate) {
            if (this.shouldCalculate())
                this.doCalculate()
            else
                this.state = AtomState.UpToDate
        }
    }


    updateValue (newValue : V) {
        this.resetCalculation()

        if (newValue === undefined) newValue = null

        const isSameValue           = this.equality(this.immutable.read(), newValue)

        if (this.state !== AtomState.Empty && !isSameValue) this.propagateStaleShallow()

        // only write the value, revision has been already updated in the `beforeCalculation`
        this.immutableForWrite().write(newValue)

        this.immutable.sameValue    = isSameValue

        if (this.immutable.usedProposedOrPrevious) {
            this.state              = this.equality(newValue, this.proposedValue) ? AtomState.UpToDate : AtomState.Stale
        } else {
            this.state              = AtomState.UpToDate
        }

        this.proposedValue          = undefined
    }


    shouldCalculateDefinitely () {
        const state     = this.state

        if (state === AtomState.Stale || state === AtomState.Empty) return true

        if (this.immutable.usedProposedOrPrevious && this.proposedValue !== undefined) return true

        return false
    }


    shouldCalculate () {
        if (this.shouldCalculateDefinitely()) return true

        const incoming  = this.immutable.getIncomingDeep()

        if (incoming) {
            for (let i = 0; i < incoming.length; i++) {
                const dependencyAtom        = incoming[ i ].owner

                dependencyAtom.actualize()

                if (this.state === AtomState.Stale) return true
            }
        }

        return false
    }


    doCalculate () {
        this.beforeCalculation()

        const prevActiveAtom        = globalContext.activeAtom

        globalContext.activeAtom    = this

        const newValue              = this.calculation.call(this.context)

        globalContext.activeAtom    = prevActiveAtom

        this.updateValue(newValue)
    }


    write (value : V) {
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

        if (this.graph) {
            this.graph.scheduleAutoCommit()

            this.graph.frozen   = false
        }

        this.proposedValue  = value

        this.propagatePossiblyStale()
    }


    clone () : this {
        const clone         = super.clone()

        clone.context       = this.context
        clone.name          = this.name
        clone.$calculation  = this.$calculation
        clone.$equality     = this.$equality

        return clone
    }

}
