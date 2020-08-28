import { AtomState } from "../atom/Atom.js"
import { AtomCalculationPriorityLevel } from "../atom/Meta.js"
import { getNextRevision } from "../atom/Node.js"
import { calculateLowerStackLevelsSync } from "../calculation/LeveledSync.js"
import { CalculationFunction, CalculationMode, CalculationModeSync } from "../CalculationMode.js"
import { EffectHandler } from "../Effect.js"
import { globalContext } from "../GlobalContext.js"
import { Box } from "./Box.js"


//---------------------------------------------------------------------------------------------------------------------
export const SynchronousCalculationStarted  = Symbol('SynchronousCalculationStarted')

const calculationStartedConstant : IteratorResult<typeof SynchronousCalculationStarted> =
    { done : false, value : SynchronousCalculationStarted }

export class CalculableBox<V = unknown> extends Box<V> {
    level           : AtomCalculationPriorityLevel  = AtomCalculationPriorityLevel.DependsOnSelfKind

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


    context     : unknown           = undefined

    $calculation : CalculationFunction<V, CalculationMode>      = undefined

    get calculation () : CalculationFunction<V, CalculationMode> {
        if (this.$calculation !== undefined) return this.$calculation

        return this.meta.calculation as any
    }
    set calculation (value : CalculationFunction<V, CalculationMode>) {
        this.$calculation = value
    }


    // $sync : boolean      = undefined
    //
    // get sync () : boolean {
    //     if (this.$sync !== undefined) return this.$sync
    //
    //     return this.meta.sync
    // }
    // set sync (value : boolean) {
    //     this.$sync = value
    // }


    iterationResult     : IteratorResult<any>       = undefined


    isCalculationStarted () : boolean {
        return Boolean(this.iterationResult)
    }


    isCalculationCompleted () : boolean {
        return Boolean(this.iterationResult && this.iterationResult.done)
    }


    beforeCalculation () {
        this.usedProposedOrPrevious             = false

        this.immutableForWrite().$incoming      = undefined
        this.immutable.revision                 = getNextRevision()

        this.state                              = AtomState.Calculating
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
        this.proposedValue          = undefined

        this.iterationResult        = undefined
    }


    proposedValue               : V             = undefined
    usedProposedOrPrevious      : boolean       = false


    onReadingPast () : this {
        const activeAtom    = globalContext.activeAtom
        const self          = this.checkoutSelf()

        if (activeAtom) {
            if (activeAtom === self) {
                self.usedProposedOrPrevious = true
            } else
                self.immutableForWrite().addOutgoing(activeAtom.immutable)
        }

        return self
    }


    // synchronously read the latest available value, either proposed by user or stale from previous iteration
    // (you should know what you are doing)
    readProposedOrLatest () : V {
        const activeAtom    = globalContext.activeAtom
        const self          = this.checkoutSelf()

        if (activeAtom) self.immutableForWrite().addOutgoing(activeAtom.immutable)

        if (self.proposedValue !== undefined) return self.proposedValue

        return self.immutable.read()
    }


    readProposedOrPrevious () : V {
        const self          = this.onReadingPast()

        const proposedValue = self.readProposedInternal()

        return proposedValue !== undefined ? proposedValue : self.readPreviousInternal()
    }


    readProposed () : V {
        const self          = this.onReadingPast()

        return self.readProposedInternal()
    }


    readPrevious () : V {
        const self          = this.onReadingPast()

        return self.readPreviousInternal()
    }


    readProposedInternal () : V {
        if (this.state === AtomState.UpToDate) {
            return this.immutable.proposedValue
        } else {
            return this.proposedValue
        }
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

        if (self.isCalculationStarted()) self.onCyclicReadDetected()

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
        if (newValue === undefined) newValue = null

        const previous              = this.immutable.readRaw()
        const isSameValue           = this.equality(previous === undefined ? null : previous, newValue)

        if (previous !== undefined && !isSameValue) this.propagateStaleShallow()

        if (!isSameValue || previous === undefined) {
            this.immutable.valueRevision = this.immutable.revision
        }

        // only write the value, revision has been already updated in the `beforeCalculation`
        this.immutableForWrite().write(newValue)

        this.immutable.proposedValue            = this.proposedValue
        this.immutable.usedProposedOrPrevious   = this.usedProposedOrPrevious

        if (this.usedProposedOrPrevious) {
            this.state              = this.equality(newValue, this.proposedValue) ? AtomState.UpToDate : AtomState.Stale
        } else {
            this.state              = AtomState.UpToDate
        }

        this.resetCalculation()
    }


    shouldCheckDependencies () : boolean {
        const state     = this.state

        if (state === AtomState.Calculating) return false

        if (state === AtomState.Stale || state === AtomState.Empty) return false

        if (this.immutable.usedProposedOrPrevious && this.proposedValue !== undefined) return false

        return true
    }


    shouldCalculate () : boolean {
        if (!this.shouldCheckDependencies()) return true

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
        const prevActiveAtom        = globalContext.activeAtom

        globalContext.activeAtom    = this

        let newValue : V            = undefined

        const onEffectSync          = this.graph ? this.graph.effectHandlerSync : globalContext.onEffectSync

        do {
            calculateLowerStackLevelsSync(onEffectSync, globalContext.stack, this)

            this.beforeCalculation()
            this.iterationResult    = calculationStartedConstant

            newValue                = this.calculation.call(this.context, onEffectSync)

            // the calculation starts in the `Calculating` state and should end up in the same, otherwise
            // if for example it is "PossiblyStale" or "Stale" - that means
            // there have been a write into the atom (or its dependency) during calculation
            // in such case we repeat the calculation
        } while (this.state !== AtomState.Calculating)

        globalContext.activeAtom    = prevActiveAtom

        this.updateValue(newValue)
    }


    write (value : V) {
        if (value === undefined) value = null

        if (this.proposedValue === undefined) {
            // still update the `proposedValue` to indicate the user input?
            this.proposedValue  = value

            // ignore the write of the same value? what about `keepIfPossible` => `pin`
            if (this.equality(this.immutable.read(), value)) return
        } else {
            if (this.equality(this.proposedValue, value)) return
        }

        this.writeConfirmedDifferentValue(value)
    }


    writeConfirmedDifferentValue (value : V) {
        this.proposedValue      = value

        this.stalenessRevision  = getNextRevision()

        this.propagatePossiblyStale()

        // see the comment in `write` method of the `Box`
        if (globalContext.activeAtom) globalContext.activeAtom.stalenessRevision = this.stalenessRevision

        if (this.graph) {
            this.graph.onDataWrite(this)
        }
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
