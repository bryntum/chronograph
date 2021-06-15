import { AnyFunction } from "../../class/Mixin.js"
import { AtomState } from "../atom/Atom.js"
import { AtomCalculationPriorityLevel } from "../atom/Meta.js"
import { getNextRevision } from "../atom/Node.js"
import { Quark } from "../atom/Quark.js"
import { calculateLowerStackLevelsSync } from "../calculation/LeveledSync.js"
import { CalculationFunction, CalculationMode, CalculationModeSync } from "../CalculationMode.js"
import { EffectHandler } from "../Effect.js"
import { ChronoGraph, globalGraph } from "../graph/Graph.js"
import { BoxUnbound } from "./Box.js"


//---------------------------------------------------------------------------------------------------------------------
export const SynchronousCalculationStarted  = Symbol('SynchronousCalculationStarted')

const calculationStartedConstant : IteratorResult<typeof SynchronousCalculationStarted> =
    { done : false, value : SynchronousCalculationStarted }

export class CalculableBoxUnbound<V = unknown> extends BoxUnbound<V> {
    level           : AtomCalculationPriorityLevel  = AtomCalculationPriorityLevel.DependsOnSelfKind

    cleanup         : AnyFunction           = undefined

    $calculationEtalon  : CalculationFunction<V, CalculationModeSync>        = undefined

    get calculationEtalon () : CalculationFunction<V, CalculationMode> {
        if (this.$calculationEtalon !== undefined) return this.$calculationEtalon

        return this.meta.calculationEtalon as any
    }
    set calculationEtalon (value : CalculationFunction<V, CalculationMode>) {
        this.$calculationEtalon = value
    }

    constructor (config? : Partial<CalculableBoxUnbound<V>>) {
        super()

        if (config) {
            if (config.meta !== undefined) this.meta = config.meta

            this.name               = config.name
            this.context            = config.context !== undefined ? config.context : this

            this.$calculation       = config.calculation
            this.$calculationEtalon = config.calculationEtalon
            this.$equality          = config.equality
            this.cleanup            = config.cleanup

            if (config.lazy !== undefined) this.lazy = config.lazy
            if (config.persistent !== undefined) this.persistent = config.persistent

            // TODO not needed explicitly (can defined based on the type of the `calculation` function?
            if (config.sync !== undefined) this.sync = config.sync
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


    resetCalculation (keepProposed : boolean) {
        if (!keepProposed) {
            this.proposedValue          = undefined
            this.proposedArgs           = undefined
        }

        this.iterationResult        = undefined
    }


    proposedValue               : V             = undefined
    proposedArgs                : unknown[]     = undefined
    usedProposedOrPrevious      : boolean       = false


    hasProposedValue () : boolean {
        if (this.proposedValue !== undefined) return true

        // `proposedValue` is persisted during the batch
        if (this.immutable.batchRevision === this.graph.activeBatchRevision) return this.immutable.hasProposedValue()

        return false
    }


    // TODO should accept `graph` argument, or, probably, `transaction`
    onReadingPast () : this {
        const activeAtom    = this.graph.activeAtom
        const self          = this.checkoutSelf()

        if (activeAtom) {
            if (activeAtom === self) {
                self.usedProposedOrPrevious = true
            } else
                self.immutableForWrite().addOutgoing(activeAtom.immutable, true)
        }

        return self
    }


    // synchronously read the latest available value, either proposed by user or possibly stale from previous iteration
    // (you should know what you are doing)
    readConsistentOrProposedOrPrevious () : V {
        // for sync atoms can always return consistent using `read()`
        if (this.sync) return this.read()

        // for async atoms return proposed or previous
        const self          = this.onReadingPast()

        if (self.state === AtomState.UpToDate) return self.immutable.read()

        const proposedValue = self.readProposedInternal()

        return proposedValue !== undefined ? proposedValue : self.immutable.read()
    }


    readProposedOrPrevious () : V {
        const self          = this.onReadingPast()

        return self.readProposedOrPreviousInternal()
    }


    readProposedOrPreviousInternal () : V {
        const proposedValue = this.readProposedInternal()

        return proposedValue !== undefined ? proposedValue : this.readPreviousInternal()
    }


    readProposed () : V {
        const self          = this.onReadingPast()

        return self.readProposedInternal()
    }


    readProposedArgs () : unknown[] {
        const self          = this.onReadingPast()

        return self.readProposedArgsInternal()
    }


    readPrevious () : V {
        const self          = this.onReadingPast()

        return self.readPreviousInternal()
    }


    readProposedInternal () : V {
        if (this.proposedValue !== undefined) return this.proposedValue

        // `proposedValue` is persisted during the batch
        if (this.immutable.batchRevision === this.graph.activeBatchRevision) return this.immutable.proposedValue

        return undefined
    }


    readProposedArgsInternal () : unknown[] {
        if (this.proposedArgs !== undefined) return this.proposedArgs

        if (this.immutable.batchRevision === this.graph.activeBatchRevision) return this.immutable.proposedArgs

        return undefined
    }


    readPreviousInternal () : V {
        if (this.state === AtomState.UpToDate)
            return this.immutable.previous ? this.immutable.previous.readRaw() : undefined
        else
            return this.immutable.readRaw()
    }


    read (graph? : ChronoGraph) : V {
        const effectiveGraph    = graph || this.graph
        const activeAtom        = effectiveGraph ? effectiveGraph.activeAtom : undefined
        const self              = this.checkoutSelf()

        if (self.immutable.isTombstone) return self.immutable.read()

        if (activeAtom) self.immutableForWrite().addOutgoing(activeAtom.immutable, false)

        if (self.isCalculationStarted()) self.onCyclicReadDetected()

        // inlined `actualize` to save 1 stack level
        if (self.state !== AtomState.UpToDate && self.graph) {
            self.graph.enterBatch()

            if (self.shouldCalculate())
                self.doCalculate()
            else
                self.state = AtomState.UpToDate

            self.graph.leaveBatch()
        }
        // eof inlined `actualize`

        return self.immutable.read()
    }


    actualize () {
        if (this.state !== AtomState.UpToDate) {
            // TODO seems actualize is only used inside the batch already, not needed
            // globalContext.enterBatch()

            if (this.shouldCalculate())
                this.doCalculate()
            else
                this.state = AtomState.UpToDate

            // globalContext.leaveBatch()
        }
    }


    updateValue (newValue : V) {
        if (newValue === undefined) newValue = null

        const immutable             = this.immutableForWrite()

        const previous              = immutable.readRaw()
        const isSameValue           = previous === undefined ? false : this.equality(previous, newValue)

        const graph                 = this.graph

        // TODO convince myself this is not a monkey-patching (about `globalContext.activeAtom ? false : true`)
        // idea is that we should not reset to stale atoms, that has already used this atom in "past" context
        // (like dispatchers)
        if (previous !== undefined && !isSameValue) this.propagateStaleShallow(graph.activeAtom ? false : true)

        immutable.batchRevision            = graph.activeBatchRevision

        if (!isSameValue || previous === undefined) {
            immutable.valueRevision        = immutable.revision
        }

        // only write the value, revision has been already updated in the `beforeCalculation`
        immutable.write(newValue)

        immutable.proposedValue            = this.proposedValue
        immutable.proposedArgs             = this.proposedArgs
        immutable.usedProposedOrPrevious   = this.usedProposedOrPrevious

        this.state                              = AtomState.UpToDate

        if (this.calculationEtalon !== undefined) {
            const onEffectSync          = this.graph ? this.graph.effectHandlerSync : graph.onEffectSync

            const prevActiveAtom        = graph.activeAtom

            graph.activeAtom    = this

            const etalon                = this.calculationEtalon.call(this.context, onEffectSync)

            graph.activeAtom    = prevActiveAtom

            if (etalon !== undefined && !this.equality(newValue, etalon)) {
                graph.staleInNextBatch.push(this)
            }
        } else
            if (this.usedProposedOrPrevious) {
                if (this.proposedValue !== undefined && !this.equality(newValue, this.proposedValue)) {
                    graph.staleInNextBatch.push(this)
                }
            }

        this.resetCalculation(false)
    }


    shouldCheckDependencies () : boolean {
        const state     = this.state

        if (state === AtomState.Calculating) return false

        if (state === AtomState.Stale || state === AtomState.Empty) return false

        if (this.immutable.usedProposedOrPrevious && this.proposedValue !== undefined) return false

        const incomingPast  = this.immutable.getIncomingPastDeep() as Quark[]

        if (incomingPast) {
            for (let i = 0; i < incomingPast.length; i++) {
                const dependencyAtom        = incomingPast[ i ].owner

                // TODO
                // @ts-ignore
                if (dependencyAtom.proposedValue !== undefined) return false
            }
        }

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
        const graph                 = this.graph

        const prevActiveAtom        = graph.activeAtom

        graph.activeAtom            = this

        let newValue : V            = undefined

        const onEffectSync          = graph.effectHandlerSync

        do {
            calculateLowerStackLevelsSync(onEffectSync, graph.stack, graph.currentTransaction, this)

            this.beforeCalculation()
            this.iterationResult    = calculationStartedConstant

            newValue                = this.calculation.call(this.context, onEffectSync)

            // the calculation starts in the `Calculating` state and should end up in the same, otherwise
            // if for example it is "PossiblyStale" or "Stale" - that means
            // there have been a write into the atom (or its dependency) during calculation
            // in such case we repeat the calculation
        } while (this.state !== AtomState.Calculating)

        // START
        // TODO the order of the following 2 lines is important
        // `updateValue` uses `propagateStaleShallow`, which clears
        // the outgoings unless there's an `activeAtom`
        // The clearing affects performance significantly
        // however, I recall I had to place the `updateValue` call
        // before this assignment (IIRC some benchmark was throwing exception)
        // need to find this benchmark again, create a test case from it
        // and figure out a proper fix
        graph.activeAtom            = prevActiveAtom

        this.updateValue(newValue)
        // END
    }


    write (value : V, ...args : unknown[]) {
        if (value === undefined) value = null

        if (this.proposedValue === undefined) {
            // TODO should take `proposedArgs` into account somehow?
            //  in general `proposedArgs` just messes things up,
            // need to get rid of this concept
            // ignore the write of the same value? what about `keepIfPossible` => `pin`
            if (this.equality(this.immutable.read(), value)) return

            // still update the `proposedValue` to indicate the user input?
            this.proposedValue  = value

            if (args.length) this.proposedArgs = args
        } else {
            if (this.equality(this.proposedValue, value)) return
        }

        this.writeConfirmedDifferentValue(value)
    }


    writeConfirmedDifferentValue (value : V) {
        this.proposedValue      = value

        this.userInputRevision  = getNextRevision()

        this.propagatePossiblyStale(true)

        const graph             = this.graph

        if (graph) {
            // see the comment in `write` method of the `Box`
            if (graph.activeAtom) graph.activeAtom.userInputRevision = this.userInputRevision

            graph.onDataWrite(this)
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


    doCleanup () {
        if (this.cleanup) this.cleanup(this)

        super.doCleanup()
    }
}


export class CalculableBox<V = unknown> extends CalculableBoxUnbound<V> {
    get boundGraph () : ChronoGraph {
        return globalGraph
    }
}
