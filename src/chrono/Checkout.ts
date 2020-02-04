import { AnyFunction, Base } from "../class/BetterMixin.js"
import { concat } from "../collection/Iterator.js"
import { CalculationContext, CalculationFunction, Context } from "../primitives/Calculation.js"
import { clearLazyProperty, copySetInto, lazyProperty } from "../util/Helpers.js"
import { ProgressNotificationEffect, RejectEffect } from "./Effect.js"
import { CalculatedValueGen, CalculatedValueGenConstructor, CalculatedValueSyncConstructor, Identifier, Variable, VariableC } from "./Identifier.js"
import { TombStone } from "./Quark.js"
import { Revision } from "./Revision.js"
import { Transaction, TransactionCommitResult, YieldableValue } from "./Transaction.js"


//---------------------------------------------------------------------------------------------------------------------
export type CommitArguments = {
}


export type CommitResult = {
    rejectedWith        : RejectEffect<unknown> | null
}


export const CommitZero : CommitResult = {
    rejectedWith        : null
}


//---------------------------------------------------------------------------------------------------------------------
export class Listener extends Base {
    handlers            : AnyFunction[]     = []

    trigger (value : any) {
        for (let i = 0; i < this.handlers.length; i++)
            this.handlers[ i ](value)
    }
}


export const ObserverSegment = Symbol('ObserverSegment')


//---------------------------------------------------------------------------------------------------------------------
export class Checkout extends Base {
    // the revision currently being "checked out"
    baseRevision            : Revision      = undefined

    // the revision to follow to, when performing `redo` operation
    topRevision             : Revision      = undefined

    // how many revisions (except the `baseRevision`) to keep in memory for undo operation
    // minimal value is 0 (the `baseRevision` only, no undo/redo)
    // users supposed to opt-in for undo/redo by increasing this config
    historyLimit            : number            = 0

    listeners               : Map<Identifier, Listener> = new Map()

    $activeTransaction      : Transaction       = undefined
    runningTransaction      : Transaction       = undefined

    isCommitting            : boolean           = false

    enableProgressNotifications     : boolean   = false

    ongoing                 : Promise<any>      = Promise.resolve()

    isInitialCommit         : boolean           = true


    initialize (...args) {
        super.initialize(...args)

        if (!this.topRevision) this.topRevision = this.baseRevision

        this.markAndSweep()
    }


    clear () {
        this.baseRevision.scope.clear()
        this.baseRevision.previous  = null
        this.listeners.clear()

        this.baseRevision   = Revision.new()
        this.topRevision    = this.baseRevision

        clearLazyProperty(this, 'followingRevision')
        this.$activeTransaction = undefined

        this.markAndSweep()
    }


    * eachReachableRevision () : IterableIterator<[ Revision, boolean ]> {
        let isBetweenTopBottom      = true
        let counter                 = 0

        for (const revision of this.topRevision.previousAxis()) {
            yield [ revision, isBetweenTopBottom || counter < this.historyLimit ]

            if (revision === this.baseRevision) {
                isBetweenTopBottom = false
            } else {
                if (!isBetweenTopBottom) counter++
            }
        }
    }


    markAndSweep () {
        let lastReferencedRevision : Revision

        const unreachableRevisions : Revision[]     = []

        for (const [ revision, isReachable ] of this.eachReachableRevision()) {
            if (isReachable) {
                revision.reachableCount++
                lastReferencedRevision              = revision
            } else
                unreachableRevisions.push(revision)

            revision.referenceCount++
        }

        unreachableRevisions.unshift(lastReferencedRevision)

        for (let i = unreachableRevisions.length - 1; i >= 1 && unreachableRevisions[ i ].reachableCount === 0; i--) {
            this.compactRevisions(unreachableRevisions[ i - 1 ], unreachableRevisions[ i ])
        }
    }


    compactRevisions (newRev : Revision, prevRev : Revision) {
        if (prevRev.reachableCount > 0 || newRev.previous !== prevRev) throw new Error("Invalid compact operation")

        // we can only shred revision if its being referenced maximum 1 time (from the current Checkout instance)
        if (prevRev.referenceCount <= 1) {
            for (const [ identifier, entry ] of newRev.scope) {
                if (entry.getValue() === TombStone) {
                    prevRev.scope.delete(identifier)
                } else {
                    const prevQuark = prevRev.scope.get(identifier)

                    if (entry.origin === entry) {
                        if (prevQuark) {
                            prevQuark.clear()
                            prevQuark.clearProperties()
                        }
                    }
                    else if (prevQuark && entry.origin === prevQuark) {
                        entry.mergePreviousOrigin(newRev.scope)
                    }
                    else if (identifier.lazy && !entry.origin && prevQuark && prevQuark.origin) {
                        // for lazy quarks, that depends on the `ProposedOrCurrent` effect, we need to save the value or proposed value
                        // from the previous revision
                        entry.startOrigin().proposedValue   = prevQuark.origin.value !== undefined ? prevQuark.origin.value : prevQuark.origin.proposedValue
                    }

                    entry.previous  = undefined

                    prevRev.scope.set(identifier, entry)
                }
            }

            copySetInto(newRev.selfDependent, prevRev.selfDependent)

            // some help for garbage collector
            // this clears the "entries" in the transaction commit result in the "finalizeCommitAsync"
            // newRev.scope.clear()
            newRev.scope            = prevRev.scope

            // make sure the previous revision won't be used inconsistently
            prevRev.scope           = null
        }
        // otherwise, we have to copy from it, and keep it intact
        else {
            newRev.scope            = new Map(concat(prevRev.scope, newRev.scope))
            newRev.selfDependent    = new Set(concat(prevRev.selfDependent, newRev.selfDependent))

            prevRev.referenceCount--
        }

        // in both cases break the `previous` chain
        newRev.previous             = null
    }


    get followingRevision () : Map<Revision, Revision> {
        return lazyProperty(this, 'followingRevision', () => {
            const revisions     = Array.from(this.topRevision.previousAxis())

            const entries : [ Revision, Revision ][]    = []

            for (let i = revisions.length - 1; i > 0; i--)
                entries.push([ revisions[ i ], revisions[ i - 1 ] ])

            return new Map(entries)
        })
    }


    get activeTransaction () : Transaction {
        if (this.$activeTransaction) return this.$activeTransaction

        return this.$activeTransaction = Transaction.new({
            baseRevision                : this.baseRevision,
            graph                       : this
        })
    }


    isCommitted () : boolean {
        return this.activeTransaction.isEmpty()
    }


    branch () : this {
        const Constructor = this.constructor as CheckoutConstructor

        return Constructor.new({ baseRevision : this.baseRevision }) as this
    }


    propagate (args? : CommitArguments) : CommitResult {
        return this.commit(args)
    }


    reject<Reason> (reason? : Reason) {
        this.activeTransaction.reject(RejectEffect.new({ reason }))

        this.$activeTransaction = undefined
    }


    commit (args? : CommitArguments) : CommitResult {
        const activeTransaction = this.activeTransaction
        const nextRevision      = activeTransaction.commit(args)

        const result            = this.finalizeCommit(nextRevision)

        this.isInitialCommit    = false

        if (!activeTransaction.rejectedWith) this.markAndSweep()

        return result
    }


    // propagateSync (args? : PropagateArguments) : PropagateResult {
    //     const nextRevision      = this.activeTransaction.propagateSync(args)
    //
    //     const result            = this.finalizePropagation(nextRevision)
    //
    //     this.runningTransaction = null
    //
    //     return result
    // }


    async propagateAsync (args? : CommitArguments) : Promise<CommitResult> {
        return this.commitAsync(args)
    }


    async commitAsync (args? : CommitArguments) : Promise<CommitResult> {
        if (this.isCommitting) return this.ongoing

        this.isCommitting       = true

        let result

        const activeTransaction = this.activeTransaction

        return this.ongoing = this.ongoing.then(() => {
            return activeTransaction.commitAsync(args)
        }).then(nextRevision => {
            result          = this.finalizeCommit(nextRevision)

            return this.finalizeCommitAsync(nextRevision)
        }).then(() => {
            this.isInitialCommit        = false

            if (!activeTransaction.rejectedWith) this.markAndSweep()

            this.isCommitting           = false

            return result
        })

        //
        // const nextRevision      = await this.activeTransaction.commitAsync(args)
        //
        // const result            = this.finalizeCommit(nextRevision)
        //
        // await this.finalizeCommitAsync(nextRevision)
        //
        // this.runningTransaction = null
        // this.isCommitting       = false
        //
        // return result
    }


    finalizeCommit (transactionResult : TransactionCommitResult) : CommitResult {
        const { revision, entries, transaction } = transactionResult

        if (revision.previous !== this.baseRevision) throw new Error('Invalid revisions chain')

        if (!transaction.rejectedWith) {
            // dereference all revisions
            for (const [ revision, isReachable ] of this.eachReachableRevision()) {
                if (isReachable) revision.reachableCount--

                revision.referenceCount--
            }

            // const previousRevision  = this.baseRevision

            this.baseRevision       = this.topRevision = revision

            // activating listeners BEFORE the `markAndSweep`, because in that call, `baseRevision`
            // might be already merged with previous
            for (const [ identifier, quarkEntry ] of entries) {
                quarkEntry.cleanup()

                // ignore "shadowing" and lazy entries
                if (quarkEntry.isShadow() || !quarkEntry.hasValue()) continue

                const listener  = this.listeners.get(identifier)

                if (listener) listener.trigger(quarkEntry.getValue())
            }

            clearLazyProperty(this, 'followingRevision')
        }

        this.$activeTransaction = undefined

        return { rejectedWith : transaction.rejectedWith }
    }


    async finalizeCommitAsync (transactionResult : TransactionCommitResult) {
    }


    variable<T> (value : T) : Variable<T> {
        const variable      = VariableC<T>()

        // always initialize variables with `null`
        return this.addIdentifier(variable, value === undefined ? null : value)
    }


    variableNamed<T> (name : any, value : T) : Variable<T> {
        const variable      = VariableC<T>({ name })

        // always initialize variables with `null`
        return this.addIdentifier(variable, value === undefined ? null : value)
    }


    identifier<ContextT extends Context, ValueT> (calculation : CalculationFunction<ContextT, ValueT, any, [ CalculationContext<any>, ...any[] ]>, context? : any) : Identifier<ValueT, ContextT> {
        const identifier : Identifier<ValueT, ContextT>  = calculation.constructor.name === 'GeneratorFunction' ?
            CalculatedValueGenConstructor<ValueT>({ calculation, context }) as Identifier<ValueT, ContextT>
            :
            CalculatedValueSyncConstructor<ValueT>({ calculation, context }) as Identifier<ValueT, ContextT>

        return this.addIdentifier(identifier)
    }


    identifierNamed<ContextT extends Context, ValueT> (name : any, calculation : CalculationFunction<ContextT, ValueT, any, [ CalculationContext<any>, ...any[] ]>, context? : any) : Identifier<ValueT, ContextT> {
        const identifier : Identifier<ValueT, ContextT>  = calculation.constructor.name === 'GeneratorFunction' ?
            CalculatedValueGenConstructor<ValueT>({ name, calculation, context }) as Identifier<ValueT, ContextT>
            :
            CalculatedValueSyncConstructor<ValueT>({ name, calculation, context }) as Identifier<ValueT, ContextT>

        return this.addIdentifier(identifier)
    }


    addIdentifier<T extends Identifier> (identifier : T, proposedValue? : any, ...args : any[]) : T {
        this.activeTransaction.addIdentifier(identifier, proposedValue, ...args)

        return identifier
    }


    removeIdentifier (identifier : Identifier) {
        this.activeTransaction.removeIdentifier(identifier)

        this.listeners.delete(identifier)
    }


    hasIdentifier (identifier : Identifier) : boolean {
        return this.activeTransaction.hasIdentifier(identifier)
    }


    write<T> (identifier : Identifier<T>, proposedValue : T, ...args : any[]) {
        this.activeTransaction.write(identifier, proposedValue, ...args)
    }


    // keep if possible?
    // pin (identifier : Identifier) : Quark {
    //     return this.activeTransaction.pin(identifier)
    // }


    // Synchronously read the "previous", "stable" value from the graph. If its a lazy entry, it will be calculated
    // Synchronous read can not calculate lazy asynchronous identifiers and will throw exception
    // Lazy identifiers supposed to be "total" (or accept repeating observes?)
    readPrevious<T> (identifier : Identifier<T>) : T {
        return this.baseRevision.read(identifier)
    }


    // Asynchronously read the "previous", "stable" value from the graph. If its a lazy entry, it will be calculated
    // Asynchronous read can calculate both synchornous and asynchronous lazy identifiers.
    // Lazy identifiers supposed to be "total" (or accept repeating observes?)
    readPreviousAsync<T> (identifier : Identifier<T>) : Promise<T> {
        return this.baseRevision.readAsync(identifier)
    }


    // Synchronously read the "current" value from the graph.
    // Synchronous read can not calculate asynchronous identifiers and will throw exception
    read<T> (identifier : Identifier<T>) : T {
        return this.activeTransaction.read(identifier)
    }


    // Asynchronously read the "current" value from the graph.
    // Asynchronous read can calculate both synchronous and asynchronous identifiers
    readAsync<T> (identifier : Identifier<T>) : Promise<T> {
        return this.activeTransaction.readAsync(identifier)
    }


    get<T> (identifier : Identifier<T>) : T | Promise<T> {
        return this.activeTransaction.get(identifier)
    }

    // // read the identifier value, return the proposed value if no "current" value is calculated yet
    // readDirty<T> (identifier : Identifier<T>) : T {
    //     return this.activeTransaction.readDirty(identifier)
    // }
    //
    //
    // // read the identifier value, return the proposed value if no "current" value is calculated yet
    // readDirtyAsync<T> (identifier : Identifier<T>) : Promise<T> {
    //     return this.activeTransaction.readDirtyAsync(identifier)
    // }


    observe
        <ContextT extends Context, Result, Yield extends YieldableValue, ArgsT extends [ CalculationContext<Yield>, ...any[] ]>
        (observerFunc : CalculationFunction<ContextT, Result, Yield, ArgsT>, onUpdated : (value : Result) => any)
    {
        const identifier    = this.addIdentifier(CalculatedValueGen.new({
            // observers are explicitly eager
            lazy            : false,

            calculation     : observerFunc as any,

            // equality        : () => false,

            // this is to be able to extract observer identifiers only
            // segment         : ObserverSegment
        }))

        return this.addListener(identifier, onUpdated)
    }


    observeContext
        <ContextT extends Context, Result, Yield extends YieldableValue, ArgsT extends [ CalculationContext<Yield>, ...any[] ]>
        (observerFunc : CalculationFunction<ContextT, Result, Yield, ArgsT>, context : object, onUpdated : (value : Result) => any) : Identifier
    {
        const identifier    = this.addIdentifier(CalculatedValueGen.new({
            // observers are explicitly eager
            lazy            : false,

            calculation     : observerFunc as any,
            context         : context,

            // equality        : () => false,

            // this is to be able to extract observer identifiers only
            // segment         : ObserverSegment
        }))

        this.addListener(identifier, onUpdated)

        return identifier
    }


    addListener (identifier : Identifier, onUpdated : (value : any) => any) {
        let listener    = this.listeners.get(identifier)

        if (!listener) {
            listener    = Listener.new()

            this.listeners.set(identifier, listener)
        }

        listener.handlers.push(onUpdated)
    }


    undo () : boolean {
        const baseRevision      = this.baseRevision
        const previous          = baseRevision.previous

        if (!previous) return false

        this.baseRevision       = previous

        // note: all unpropagated "writes" are lost
        this.$activeTransaction = undefined

        return true
    }


    redo () : boolean {
        const baseRevision      = this.baseRevision

        if (baseRevision === this.topRevision) return false

        const nextRevision      = this.followingRevision.get(baseRevision)

        this.baseRevision       = nextRevision

        // note: all unpropagated "writes" are lost
        this.$activeTransaction = undefined

        return true
    }


    onPropagationProgressNotification (notification : ProgressNotificationEffect) {
    }
}

export type CheckoutConstructor = typeof Checkout
