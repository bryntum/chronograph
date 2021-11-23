import { Base } from "../class/Base.js"
import { AnyFunction } from "../class/Mixin.js"
import { concat } from "../collection/Iterator.js"
import { warn } from "../environment/Debug.js"
import { CalculationContext, CalculationFunction, CalculationIterator, Context } from "../primitives/Calculation.js"
import { copySetInto, isGeneratorFunction } from "../util/Helpers.js"
import {
    BreakCurrentStackExecution,
    Effect,
    HasProposedValueSymbol,
    OwnIdentifierSymbol,
    OwnQuarkSymbol,
    PreviousValueOfEffect,
    PreviousValueOfSymbol,
    ProgressNotificationEffect,
    ProposedArgumentsOfSymbol,
    ProposedOrPreviousSymbol,
    ProposedOrPreviousValueOfSymbol,
    ProposedValueOfEffect,
    ProposedValueOfSymbol,
    RejectEffect,
    RejectSymbol,
    TransactionSymbol,
    UnsafePreviousValueOfSymbol,
    UnsafeProposedOrPreviousValueOfSymbol,
    WriteEffect,
    WriteSeveralEffect,
    WriteSeveralSymbol,
    WriteSymbol
} from "./Effect.js"
import { CalculatedValueGen, CalculatedValueGenC, CalculatedValueSyncC, Identifier, Variable, VariableC } from "./Identifier.js"
import { TombStone, Quark } from "./Quark.js"
import { Revision } from "./Revision.js"
import { EdgeTypePast, Transaction, TransactionCommitResult, YieldableValue } from "./Transaction.js"
import { ComputationCycle } from "./TransactionCycleDetectionWalkContext.js"


//---------------------------------------------------------------------------------------------------------------------
/**
 * The type of the argument for the [[commit]] call. Currently empty.
 */
export type CommitArguments = {
}


/**
 * The type of the return value of the [[commit]] call.
 */
export type CommitResult = {
    /**
     * If the transaction has been rejected, this property will be filled with the [[RejectEffect]] instance
     */
    rejectedWith?       : RejectEffect<unknown> | null
}


/**
 * A constant which will be used a commit result, when graph is not available.
 */
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


//---------------------------------------------------------------------------------------------------------------------
/**
 * Generic reactive graph. Consists from [[Identifier]]s, depending on each other. This is a low-level representation
 * of the ChronoGraph dataset, it is not "aware" of the entity/relation framework and operates as "just graph".
 *
 * For higher-level (and more convenient) representation, please refer to [[Replica]].
 *
 * An example of usage:
 *
 *     const graph      = ChronoGraph.new({ historyLimit : 10 })
 *
 *     const var1       = graph.variable(1)
 *     const var2       = graph.variable(2)
 *     const iden1      = graph.identifier((Y) => Y(var1) + Y(var2))
 *
 *     graph.read(iden1) // 3
 *
 *     graph.commit()
 *
 *     graph.write(var1, 2)
 *
 *     graph.read(iden1) // 4
 *
 *     graph.reject()
 *
 *     graph.read(var1) // 1
 *     graph.read(iden1) // 3
 *
 */
export class ChronoGraph extends Base {
    baseRevisionStable      : Revision      = undefined
    baseRevisionTentative   : Revision      = undefined

    baseRevision            : Revision      = Revision.new()

    // the revision to follow to, when performing `redo` operation
    topRevision             : Revision      = undefined

    /**
     * Integer value, indicating how many transactions to keep in memory, to be available for [[undo]] call.
     * Default value is 0 - previous transaction is cleared immediately.
     *
     * Increase this config to opt-in for the [[undo]]/[[redo]] functionality.
     */
    historyLimit            : number            = 0

    listeners               : Map<Identifier, Listener> = new Map()

    $activeTransaction      : Transaction       = undefined

    isCommitting            : boolean           = false

    enableProgressNotifications     : boolean   = false

    ongoing                 : Promise<any>      = Promise.resolve()

    _isInitialCommit        : boolean           = true

    //-------------------------------------
    // a "cross-platform" trick to avoid specifying the type of the `autoCommitTimeoutId` explicitly
    autoCommitTimeoutId     : ReturnType<typeof setTimeout> = null

    /**
     * If this option is enabled with `true` value, all data modification calls ([[write]], [[addIdentifier]], [[removeIdentifier]]) will trigger
     * a delayed [[commit]] call (or [[commitAsync]], depending from the [[autoCommitMode]] option).
     */
    autoCommit              : boolean           = false

    /**
     * Indicates the default commit mode, which is used in [[autoCommit]].
     */
    autoCommitMode          : 'sync' | 'async'  = 'sync'

    autoCommitHandler       : AnyFunction       = null

    onWriteDuringCommit     : 'throw' | 'warn' | 'ignore' = 'throw'

    onComputationCycle      : 'throw' | 'warn' | 'reject' | 'ignore' | 'effect' = 'throw'

    transactionClass        : typeof Transaction    = Transaction


    initialize (...args) {
        super.initialize(...args)

        if (!this.topRevision) this.topRevision = this.baseRevision

        if (this.autoCommit) {
            this.autoCommitHandler = this.autoCommitMode === 'sync' ? arg => this.commit(arg) : async arg => this.commitAsync(arg)
        }

        this.markAndSweep()
    }


    /**
     * Returns boolean, indicating whether the auto-commit is pending.
     */
    hasPendingAutoCommit () : boolean {
        return this.autoCommitTimeoutId !== null
    }


    get dirty () : boolean {
        return this.activeTransaction.dirty
    }


    clear () {
        this.reject()

        this.unScheduleAutoCommit()

        // some stale state - `clear` called at sensitive time
        this.baseRevision.scope && this.baseRevision.scope.clear()
        this.baseRevision.previous  = null
        this.listeners.clear()

        this.topRevision    = this.baseRevision

        this.$followingRevision = undefined
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


    get isInitialCommit () : boolean {
        return this._isInitialCommit
    }


    set isInitialCommit (value : boolean) {
        this._isInitialCommit = value
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
                        // for lazy quarks, that depends on the `ProposedOrPrevious` effect, we need to save the value or proposed value
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


    $followingRevision : Map<Revision, Revision>    = undefined

    get followingRevision () : Map<Revision, Revision> {
        if (this.$followingRevision !== undefined) return this.$followingRevision

        const revisions     = Array.from(this.topRevision.previousAxis())

        const entries : [ Revision, Revision ][]    = []

        for (let i = revisions.length - 1; i > 0; i--)
            entries.push([ revisions[ i ], revisions[ i - 1 ] ])

        return this.$followingRevision = new Map(entries)
    }


    get activeTransaction () : Transaction {
        if (this.$activeTransaction) return this.$activeTransaction

        return this.$activeTransaction = this.transactionClass.new({
            baseRevision                : this.baseRevisionTentative || this.baseRevision,
            graph                       : this
        })
    }


    /**
     * Creates a new branch of this graph. Only committed data will be "visible" in the new branch.
     *
     * ```ts
     * const graph2 = ChronoGraph.new()
     *
     * const variable13 : Variable<number> = graph2.variable(5)
     *
     * const branch2 = graph2.branch()
     *
     * branch2.write(variable13, 10)
     *
     * const value13_1 = graph2.read(variable13)  // 5
     * const value13_2 = branch2.read(variable13) // 10
     * ```
     *
     * When using the branching feature in [[Replica]], you need to reference the field values by yielding their
     * corresponding identifiers. This is because ChronoGraph need to know in context of which branch
     * the calculation happens and this information is encoded in the outer context. This may improve in the future.
     *
     * ```ts
     * class Author extends Entity.mix(Base) {
     *     @calculate('fullName')
     *     calculateFullName (Y) : string {
     *         return Y(this.$.firstName) + ' ' + Y(this.$.lastName)
     *     }
     *
     *     @calculate('fullName')
     *     * calculateFullName (Y) : CalculationIterator<string> {
     *         return (yield this.$.firstName) + ' ' + (yield this.$.lastName)
     *     }
     * }
     * ```
     *
     * @param config Configuration object for the new graph instance.
     */
    branch (config? : Partial<this>) : this {
        const Constructor = this.constructor as (typeof ChronoGraph)

        return Constructor.new(Object.assign({}, config, { baseRevision : this.baseRevision })) as this
    }


    propagate (args? : CommitArguments) : CommitResult {
        return this.commit(args)
    }


    /**
     * Rejects the current changes in the graph and revert it to the state of the previous [[commit]].
     *
     * See also [[RejectEffect]].
     *
     * @param reason Any value, describing why reject has happened
     */
    reject<Reason> (reason? : Reason) {
        this.activeTransaction.reject(RejectEffect.new({ reason }))

        // reject resets the `ongoing` promise (which is possibly rejected because of cycle exception)
        this.ongoing            = Promise.resolve()

        this.$activeTransaction = undefined

        this.baseRevisionTentative  = undefined

        if (this.baseRevisionStable) {
            this.baseRevision           = this.baseRevisionStable
            this.baseRevisionStable     = undefined
        }
    }


    /**
     * Synchronously commit the state of the graph. All potentially changed [[Identifier.lazy|strict]] identifiers
     * will be calculated during this call. If any of such identifiers will be [[Identifier.sync|async]], an exception
     * will be thrown.
     *
     * This call marks a "stable" state of the graph and a transaction border. Using the [[undo]] call one can revert to the previous
     * state.
     *
     * See also [[reject]].
     *
     * @param args
     */
    commit (args? : CommitArguments) : CommitResult {
        // TODO should have a "while" loop adding extra transactions, similar to `commitAsync`
        this.unScheduleAutoCommit()

        this.baseRevisionStable = this.baseRevision

        const activeTransaction         = this.activeTransaction
        const transactionCommitResult   = activeTransaction.commit(args)

        this.$activeTransaction = undefined

        const result            = this.finalizeCommit(transactionCommitResult)

        this.baseRevisionStable = undefined

        this.isInitialCommit    = false

        return result
    }


    async propagateAsync (args? : CommitArguments) : Promise<CommitResult> {
        return this.commitAsync(args)
    }


    /**
     * Asynchronously commit the state of the replica. All potentially changed strict identifiers (see [[Identifier.lazy]])
     * will be calculated during this call.
     *
     * This call marks a "stable" state of the graph and a transaction border. Using the [[undo]] call one can revert to the previous
     * state.
     *
     * See also [[reject]].
     *
     * @param args
     */
    async commitAsync (args? : CommitArguments) : Promise<CommitResult> {
        if (this.isCommitting) return this.ongoing

        this.isCommitting       = true

        this.baseRevisionStable = this.baseRevision

        let result : CommitResult

        return this.ongoing = this.ongoing.then(() => {
            return this.doCommitAsync(args)
        }).then(res => {
            result  = res

            return res
        }).finally(() => {
            this.baseRevisionStable     = undefined
            this.baseRevisionTentative  = undefined
            this.isInitialCommit        = false

            this.isCommitting           = false
        })
    }


    async doCommitAsync (args? : CommitArguments) : Promise<CommitResult> {
        this.unScheduleAutoCommit()

        const activeTransaction = this.activeTransaction

        const transactionResult = await activeTransaction.commitAsync(args)

        this.baseRevisionTentative  = activeTransaction.candidate
        this.$activeTransaction     = undefined

        const result            = this.finalizeCommit(transactionResult)

        await this.finalizeCommitAsync(transactionResult)

        if (activeTransaction.rejectedWith) activeTransaction.clearRejected()

        if (this.dirty) {
            await this.doCommitAsync(args)
        }

        return result
    }


    finalizeCommit (transactionResult : TransactionCommitResult) : CommitResult {
        const { revision, entries, transaction } = transactionResult

        if (!transaction.rejectedWith) {
            if (revision.previous !== this.baseRevision) throw new Error('Invalid revisions chain')

            // dereference all revisions
            for (const [ revision, isReachable ] of this.eachReachableRevision()) {
                if (isReachable) revision.reachableCount--

                revision.referenceCount--
            }

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

            this.$followingRevision     = undefined

            this.markAndSweep()
        } else {
            // `baseRevisionStable` might be already cleared in the `reject` method of the graph
            if (this.baseRevisionStable) this.baseRevision = this.baseRevisionStable

            this.baseRevisionStable     = undefined
            this.baseRevisionTentative  = undefined
        }

        return { rejectedWith : transaction.rejectedWith }
    }


    async finalizeCommitAsync (transactionResult : TransactionCommitResult) {
    }

    * onComputationCycleHandler (cycle : ComputationCycle) : Generator<any, IteratorResult<any>> {
        const exception = new Error("Computation cycle:\n" + cycle)

        //@ts-ignore
        exception.cycle = cycle

        switch (this.onComputationCycle) {
            case 'ignore' :
                console.log(exception.message)
                const { requestedEntry, activeEntry } = cycle
                // if we ignore the cycle we just continue the calculation with the best possible value
                return activeEntry.continueCalculation(requestedEntry.proposedValue !== undefined ? requestedEntry.proposedValue : requestedEntry.value)
            case 'throw' :
                throw exception
            case 'reject' :
                this.reject(exception)
                break
            case 'warn' :
                warn(exception)
                break
        }
    }


    onComputationCycleHandlerSync (cycle : ComputationCycle) {
        const exception = new Error("Computation cycle:\n" + cycle)

        //@ts-ignore
        exception.cycle = cycle

        switch (this.onComputationCycle) {
            case 'ignore' :
                console.log(exception.message)
                const { requestedEntry, activeEntry } = cycle
                // if we ignore the cycle we just continue the calculation with the best possible value
                return activeEntry.continueCalculation(requestedEntry.proposedValue !== undefined ? requestedEntry.proposedValue : requestedEntry.value)
            case 'throw' :
                throw exception
            case 'reject' :
                this.reject(exception)
                break
            case 'warn' :
                warn(exception)
                break
        }
    }


    scheduleAutoCommit () {
        // the `&& !this.isCommitting` part was added for the conflicts branch
        // however, it seems to fail several tests
        // commenting for now, to be reviewed later
        if (this.autoCommitTimeoutId === null && !this.isCommitting) {
            this.autoCommitTimeoutId    = setTimeout(this.autoCommitHandler, 10)
        }
    }


    unScheduleAutoCommit () {
        if (this.autoCommitTimeoutId !== null) {
            clearTimeout(this.autoCommitTimeoutId)
            this.autoCommitTimeoutId    = null
        }
    }


    /**
     * Creates a variable identifier with the given initial value and adds it to graph.
     *
     * @param value The initial value. The `undefined` value will be converted to `null`
     */
    variable<T> (value : T) : Variable<T> {
        const variable      = VariableC<T>()

        // always initialize variables with `null`
        return this.addIdentifier(variable, value === undefined ? null : value)
    }


    /**
     * Creates a named variable identifier with the given initial value and adds it to graph.
     *
     * @param name The [[Variable.name]] property of the newly created variable
     * @param value The initial value. The `undefined` value will be converted to `null`
     */
    variableNamed<T> (name : any, value : T) : Variable<T> {
        const variable      = VariableC<T>({ name })

        // always initialize variables with `null`
        return this.addIdentifier(variable, value === undefined ? null : value)
    }

    /**
     * Creates an identifier based on the given calculation function and adds it to this graph. Depending form the type of the function
     * (sync/generator) either [[CalculatedValueGen]] or [[CalculatedValueSync]] will be created.
     *
     * To have full control on the identifier creation, instantiate it yourself and add to graph using the [[ChronoGraph.addIdentifier]] call.
     *
     * @param calculation The calculation function of the identifier.
     * @param context The [[Identifier.context|context]] property of the newly created identifier
     */
    identifier<ContextT extends Context, ValueT> (calculation : CalculationFunction<ContextT, ValueT, any, [ CalculationContext<any>, ...any[] ]>, context? : any) : Identifier<ValueT, ContextT> {
        const identifier : Identifier<ValueT, ContextT>  = isGeneratorFunction(calculation) ?
            CalculatedValueGenC<ValueT>({ calculation, context }) as Identifier<ValueT, ContextT>
            :
            CalculatedValueSyncC<ValueT>({ calculation, context }) as Identifier<ValueT, ContextT>

        return this.addIdentifier(identifier)
    }


    /**
     * Creates a named identifier based on the given calculation function and adds it to this graph. Depending form the type of the function
     * (sync/generator) either [[CalculatedValueGen]] or [[CalculatedValueSync]] will be created.
     *
     * To have full control on the identifier creation, instantiate it yourself and add to graph using the [[ChronoGraph.addIdentifier]] call.
     *
     * @param name The [[Identifier.name]] property of the newly created identifier
     * @param calculation The calculation function of the identifier.
     * @param context The [[Identifier.context]] property of the newly created identifier
     */
    identifierNamed<ContextT extends Context, ValueT> (name : any, calculation : CalculationFunction<ContextT, ValueT, any, [ CalculationContext<any>, ...any[] ]>, context? : any) : Identifier<ValueT, ContextT> {
        const identifier : Identifier<ValueT, ContextT>  = calculation.constructor.name === 'GeneratorFunction' ?
            CalculatedValueGenC<ValueT>({ name, calculation, context }) as Identifier<ValueT, ContextT>
            :
            CalculatedValueSyncC<ValueT>({ name, calculation, context }) as Identifier<ValueT, ContextT>

        return this.addIdentifier(identifier)
    }


    /**
     * Adds an identifier to this graph. Optionally [[write|writes]] the `proposedValue` to it afterwards.
     *
     * @param identifier
     * @param proposedValue
     * @param args
     */
    addIdentifier<T extends Identifier> (identifier : T, proposedValue? : any, ...args : any[]) : T {
        if (this.isCommitting) {
            if (this.onWriteDuringCommit === 'throw')
                throw new Error('Adding identifier during commit')
            else if (this.onWriteDuringCommit === 'warn')
                warn(new Error('Adding identifier during commit'))
        }

        this.activeTransaction.addIdentifier(identifier, proposedValue, ...args)

        if (this.autoCommit) this.scheduleAutoCommit()

        return identifier
    }


    /**
     * Removes an identifier from this graph.
     *
     * @param identifier
     */
    removeIdentifier (identifier : Identifier) {
        if (this.isCommitting) {
            if (this.onWriteDuringCommit === 'throw')
                throw new Error('Removing identifier during commit')
            else if (this.onWriteDuringCommit === 'warn')
                warn(new Error('Removinfg identifier during commit'))
        }

        this.activeTransaction.removeIdentifier(identifier)

        this.listeners.delete(identifier)

        if (this.autoCommit) this.scheduleAutoCommit()
    }


    /**
     * Tests, whether this graph has given identifier.
     *
     * @param identifier
     */
    hasIdentifier (identifier : Identifier) : boolean {
        return this.activeTransaction.hasIdentifier(identifier)
    }


    /**
     * Writes a value to the given `identifier`.
     *
     * @param identifier
     * @param proposedValue
     * @param args
     */
    write<T> (identifier : Identifier<T>, proposedValue : T, ...args : any[]) {
        if (this.isCommitting) {
            if (this.onWriteDuringCommit === 'throw')
                throw new Error('Write during commit')
            else if (this.onWriteDuringCommit === 'warn')
                warn(new Error('Write during commit'))
        }

        this.activeTransaction.write(identifier, proposedValue, ...args)

        if (this.autoCommit) this.scheduleAutoCommit()
    }


    // keep if possible?
    // pin (identifier : Identifier) : Quark {
    //     return this.activeTransaction.pin(identifier)
    // }


    // Synchronously read the "previous", "stable" value from the graph. If its a lazy entry, it will be calculated
    // Synchronous read can not calculate lazy asynchronous identifiers and will throw exception
    // Lazy identifiers supposed to be "total" (or accept repeating observes?)
    readPrevious<T> (identifier : Identifier<T>) : T {
        return this.activeTransaction.readPrevious(identifier)
    }


    // Asynchronously read the "previous", "stable" value from the graph. If its a lazy entry, it will be calculated
    // Asynchronous read can calculate both synchornous and asynchronous lazy identifiers.
    // Lazy identifiers supposed to be "total" (or accept repeating observes?)
    readPreviousAsync<T> (identifier : Identifier<T>) : Promise<T> {
        return this.activeTransaction.readPreviousAsync(identifier)
    }


    /**
     * Synchronously read the value of the given identifier from the graph.
     *
     * Synchronous read can not calculate asynchronous identifiers and will throw exception
     *
     * @param identifier
     */
    read<T> (identifier : Identifier<T>) : T {
        return this.activeTransaction.read(identifier)
    }


    /**
     * Asynchronously read the value of the given identifier from the graph.
     *
     * Asynchronous read can calculate both synchronous and asynchronous identifiers
     *
     * @param identifier
     */
    readAsync<T> (identifier : Identifier<T>) : Promise<T> {
        return this.activeTransaction.readAsync(identifier)
    }


    /**
     * Read the value of the identifier either synchronously or asynchronously, depending on its type (see [[Identifier.sync]])
     *
     * @param identifier
     */
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
        (observerFunc : CalculationFunction<ContextT, Result, Yield, ArgsT>, onUpdated : (value : Result) => any) : Identifier<Result>
    {
        const identifier    = this.addIdentifier(CalculatedValueGen.new({
            // observers are explicitly eager
            lazy            : false,

            calculation     : observerFunc as any,

            // equality        : () => false,

            // this is to be able to extract observer identifiers only
            // segment         : ObserverSegment
        }))

        this.addListener(identifier, onUpdated)

        return identifier as Identifier<Result>
    }


    observeContext
        <ContextT extends Context, Result, Yield extends YieldableValue, ArgsT extends [ CalculationContext<Yield>, ...any[] ]>
        (observerFunc : CalculationFunction<ContextT, Result, Yield, ArgsT>, context : object, onUpdated : (value : Result) => any) : Identifier<Result>
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

        return identifier as Identifier<Result>
    }


    addListener (identifier : Identifier, onUpdated : (value : any) => any) {
        let listener    = this.listeners.get(identifier)

        if (!listener) {
            listener    = Listener.new()

            this.listeners.set(identifier, listener)
        }

        listener.handlers.push(onUpdated)
    }


    /**
     * Revert the replica to the state of previous transaction (marked with the [[commit]] call).
     *
     * To enable this feature, you need to opt-in using the [[ChronoGraph.historyLimit|historyLimit]] configuration property.
     *
     * Returns boolean, indicating whether the state transition actually happened.
     */
    undo () : boolean {
        const baseRevision      = this.baseRevision
        const previous          = baseRevision.previous

        if (!previous) return false

        this.baseRevision       = previous

        // note: all unpropagated "writes" are lost
        this.$activeTransaction = undefined

        return true
    }


    /**
     * Advance the replica to the state of next transaction (marked with the [[commit]] call). Only meaningful
     * if a [[ChronoGraph.undo|undo]] call has been made earlier.
     *
     * To enable this feature, you need to opt-in using the [[historyLimit]] configuration property.
     *
     * Returns boolean, indicating whether the state transition actually happened.
     */
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


    [ProposedOrPreviousSymbol] (effect : Effect, transaction : Transaction) : any {
        const activeEntry       = transaction.getActiveEntry()
        activeEntry.usedProposedOrPrevious = true

        const proposedValue     = activeEntry.getProposedValue(transaction)

        if (proposedValue !== undefined) return proposedValue

        // newly added identifier
        if (!activeEntry.previous) return undefined

        const identifier        = activeEntry.identifier

        if (identifier.lazy) {
            if (activeEntry.previous.hasValue()) return activeEntry.previous.getValue()

            if (activeEntry.previous.hasProposedValue()) return activeEntry.previous.getProposedValue(transaction)

            return null
        }

        return transaction.readPrevious(activeEntry.identifier)
    }


    [RejectSymbol] (effect : RejectEffect<any>, transaction : Transaction) : any {
        this.reject(effect.reason)

        return BreakCurrentStackExecution
    }


    [TransactionSymbol] (effect : Effect, transaction : Transaction) : any {
        return transaction
    }


    [OwnQuarkSymbol] (effect : Effect, transaction : Transaction) : any {
        return transaction.getActiveEntry()
    }


    [OwnIdentifierSymbol] (effect : Effect, transaction : Transaction) : any {
        const activeEntry   = transaction.getActiveEntry()
        return activeEntry.identifier
    }


    [WriteSymbol] (effect : WriteEffect, transaction : Transaction) : any {
        const activeEntry   = transaction.getActiveEntry()

        if (activeEntry.identifier.lazy) throw new Error('Lazy identifiers can not use `Write` effect')

        const writeToHigherLevel    = effect.identifier.level > activeEntry.identifier.level

        if (!writeToHigherLevel) transaction.walkContext.startNewEpoch()

        transaction.write(effect.identifier, ...effect.proposedArgs)

        // // transaction.writes.push(effect)
        //
        // // const writeTo   = effect.identifier
        // //
        // // writeTo.write.call(writeTo.context || writeTo, writeTo, transaction, null, ...effect.proposedArgs)
        //
        // transaction.onNewWrite()
        return writeToHigherLevel ? undefined : BreakCurrentStackExecution
    }


    [WriteSeveralSymbol] (effect : WriteSeveralEffect, transaction : Transaction) : any {

        const activeEntry   = transaction.getActiveEntry()
        if (activeEntry.identifier.lazy) throw new Error('Lazy identifiers can not use `Write` effect')

        let writeToHigherLevel    = true

        // effect.writes.forEach(writeInfo => {
        effect.writes.forEach(writeInfo => {
            if (writeInfo.identifier.level <= activeEntry.identifier.level && writeToHigherLevel) {
                transaction.walkContext.startNewEpoch()

                writeToHigherLevel = false
            }

            transaction.write(writeInfo.identifier, ...writeInfo.proposedArgs)
        })

            // const identifier    = writeInfo.identifier
            //
            // identifier.write.call(identifier.context || identifier, identifier, transaction, null, ...writeInfo.proposedArgs)
        // })

        // transaction.onNewWrite()

        return writeToHigherLevel ? undefined : BreakCurrentStackExecution
    }


    [PreviousValueOfSymbol] (effect : PreviousValueOfEffect, transaction : Transaction) : any {
        const activeEntry   = transaction.getActiveEntry()
        const source        = effect.identifier

        transaction.addEdge(source, activeEntry, EdgeTypePast)

        return transaction.readPrevious(source)
    }


    [ProposedValueOfSymbol] (effect : ProposedValueOfEffect, transaction : Transaction) : any {
        const activeEntry   = transaction.getActiveEntry()
        const source        = effect.identifier

        transaction.addEdge(source, activeEntry, EdgeTypePast)

        const quark     = transaction.entries.get(source)

        const proposedValue = quark && !quark.isShadow() ? quark.getProposedValue(transaction) : undefined

        return proposedValue
    }


    [HasProposedValueSymbol] (effect : ProposedValueOfEffect, transaction : Transaction) : any {
        const activeEntry   = transaction.getActiveEntry()
        const source        = effect.identifier

        transaction.addEdge(source, activeEntry, EdgeTypePast)

        const quark     = transaction.entries.get(source)

        return quark ? quark.hasProposedValue() : false
    }


    [ProposedOrPreviousValueOfSymbol] (effect : ProposedValueOfEffect, transaction : Transaction) : any {
        const activeEntry   = transaction.getActiveEntry()
        const source        = effect.identifier

        transaction.addEdge(source, activeEntry, EdgeTypePast)

        return transaction.readProposedOrPrevious(source)
    }


    [UnsafeProposedOrPreviousValueOfSymbol] (effect : ProposedValueOfEffect, transaction : Transaction) : any {
        return transaction.readProposedOrPrevious(effect.identifier)
    }


    [UnsafePreviousValueOfSymbol] (effect : ProposedValueOfEffect, transaction : Transaction) : any {
        return transaction.readPrevious(effect.identifier)
    }


    [ProposedArgumentsOfSymbol] (effect : ProposedValueOfEffect, transaction : Transaction) : any {
        const activeEntry   = transaction.getActiveEntry()
        const source        = effect.identifier

        transaction.addEdge(source, activeEntry, EdgeTypePast)

        const quark         = transaction.entries.get(source)

        return quark && !quark.isShadow() ? quark.proposedArguments : undefined
    }
}

/**
 * Type, that represent the return value of the generator-based identifier's calculation function.
 * The `Result` argument corresponds to the type of the value being computed.
 *
 * For example:
 *
 *     class Author extends Entity.mix(Base) {
 *         @field()
 *         firstName       : string
 *         @field()
 *         lastName        : string
 *         @field()
 *         fullName        : string
 *
 *         @calculate('fullName')
 *         * calculateFullName () : ChronoIterator<string> {
 *             return (yield this.$.firstName) + ' ' + (yield this.$.lastName)
 *         }
 *     }
 */
export type ChronoIterator<ResultT, YieldT = any> = CalculationIterator<ResultT, YieldT>
