import { Base } from "../class/Base.js"
import { DEBUG } from "../environment/Debug.js"
import { cycleInfo, OnCycleAction, WalkStep } from "../graph/WalkDepth.js"
import {
    CalculationContext,
    runGeneratorAsyncWithEffect,
    SynchronousCalculationStarted
} from "../primitives/Calculation.js"
import { delay, isPromise, MAX_SMI } from "../util/Helpers.js"
import { LeveledQueue } from "../util/LeveledQueue.js"
import { BreakCurrentStackExecution, Effect, RejectEffect } from "./Effect.js"
import { ChronoGraph, CommitArguments } from "./Graph.js"
import { Identifier, Levels, throwUnknownIdentifier } from "./Identifier.js"
import { EdgeType, Quark, TombStone } from "./Quark.js"
import { Revision, Scope } from "./Revision.js"
import { ComputationCycle, TransactionCycleDetectionWalkContext } from "./TransactionCycleDetectionWalkContext.js"
import { TransactionWalkDepth } from "./TransactionWalkDepth.js"


//---------------------------------------------------------------------------------------------------------------------
export type NotPromise<T> = T extends Promise<any> ? never : T

/**
 * A type for the value, that can be yielded as an effect.
 */
export type YieldableValue = Effect | Identifier | Promise<any>

/**
 * A type for the synchronous effect handler function
 */
export type SyncEffectHandler = <T extends any>(effect : YieldableValue) => T & NotPromise<T>
export type AsyncEffectHandler = <T extends any>(effect : YieldableValue) => Promise<T>


//---------------------------------------------------------------------------------------------------------------------
// weird stack overflow on 1300 deep benchmark, when using `EdgeType.Normal` w/o aliasing it to constant first

export const EdgeTypeNormal    = EdgeType.Normal
export const EdgeTypePast      = EdgeType.Past


//---------------------------------------------------------------------------------------------------------------------
/**
 * The result of a [[Transaction.commit]] or [[Transaction.commitAsync]] call.
 * Contains the new [[Revision]], the set of affected [[Quark]] entries, and a reference
 * back to the originating [[Transaction]].
 */
export type TransactionCommitResult = { revision : Revision, entries : Scope, transaction : Transaction }


//---------------------------------------------------------------------------------------------------------------------
/**
 * The computation context that drives reactive propagation in ChronoGraph. A transaction collects all
 * writes (data modifications), walks the dependency graph to determine which identifiers need recalculation,
 * executes those calculations in topological order, and then either commits the results as a new [[Revision]]
 * or rejects (rolls back) all changes.
 *
 * Lifecycle: write → propagate (walk dependency graph) → calculate → commit or reject.
 *
 * Transactions are typically created and managed by a [[ChronoGraph]] instance. End users rarely need
 * to interact with transactions directly.
 */
export class Transaction extends Base {
    /** The base [[Revision]] this transaction is built upon. */
    baseRevision            : Revision              = undefined

    candidateClass          : typeof Revision       = Revision

    /** The candidate [[Revision]] being constructed by this transaction. Becomes the new base after commit. */
    candidate               : Revision              = undefined

    /** The [[ChronoGraph]] instance that owns this transaction. */
    graph                   : ChronoGraph              = undefined

    /** Whether this transaction has been closed (committed or in the process of committing). */
    isClosed                : boolean               = false

    walkContext             : TransactionWalkDepth   = undefined

    /**
     * The working set of quarks modified or visited in this transaction.
     * Maps each affected [[Identifier]] to its corresponding [[Quark]] entry.
     */
    entries                 : Map<Identifier, Quark> = new Map()

    // // we use 2 different stacks, because they support various effects
    // stackSync               : LeveledQueue<Quark>  = new LeveledQueue()
    /**
     * The ordered calculation queue. Quarks are pushed here during the graph walk and processed
     * level-by-level (lowest level first) during propagation.
     */
    stackGen                : LeveledQueue<Quark>  = new LeveledQueue()

    /**
     * Stack tracking the currently-computing quark chain. The last element is the quark
     * whose calculation function is currently executing.
     */
    activeStack             : Quark[]               = []

    /** Synchronous effect handler, bound to [[read]] during initialization. */
    onEffectSync            : SyncEffectHandler     = undefined

    /** Asynchronous effect handler, bound to [[readAsync]] during initialization. */
    onEffectAsync           : AsyncEffectHandler    = undefined

    //---------------------
    propagationStartDate            : number        = 0
    lastProgressNotificationDate    : number        = 0

    startProgressNotificationsAfterMs : number      = 500
    emitProgressNotificationsEveryMs  : number      = 200

    // TODO auto-adjust this parameter to match the emitProgressNotificationsEveryMs (to avoid calls to time functions)
    emitProgressNotificationsEveryCalculations  : number = 100

    plannedTotalIdentifiersToCalculate  : number    = 0

    // writes                  : WriteInfo[]           = []

    ongoing                 : Promise<any>          = Promise.resolve()

    selfDependedMarked      : boolean               = false

    /** If set, indicates the transaction has been rejected. Contains the [[RejectEffect]] with the rejection reason. */
    rejectedWith            : RejectEffect<unknown> = undefined
    stopped                 : boolean               = false

    hasEntryWithProposedValue : boolean             = false

    hasVariableEntry          : boolean             = false


    initialize (...args) {
        super.initialize(...args)

        this.walkContext    = TransactionWalkDepth.new({
            visited         : this.entries,
            transaction     : this,
            baseRevision    : this.baseRevision,
            pushTo          : this.stackGen
        })

        if (!this.candidate) this.candidate = this.candidateClass.new({ previous : this.baseRevision })

        // the `onEffectSync` should be bound to the `yieldSync` of course, and `yieldSync` should look like:
        //     yieldSync (effect : YieldableValue) : any {
        //         if (effect instanceof Identifier) return this.read(effect)
        //     }
        // however, the latter consumes more stack frames - every read goes through `yieldSync`
        // since `read` is the most used effect anyway, we bind `onEffectSync` to `read` and
        // instead inside of `read` delegate to `yieldSync` for non-identifiers
        this.onEffectSync   = /*this.onEffectAsync =*/ this.read.bind(this)
        this.onEffectAsync  = this.readAsync.bind(this)
    }


    /** Whether this transaction has any pending modifications. */
    get dirty () : boolean {
        return this.entries.size > 0
    }


    markSelfDependent () {
        if (this.selfDependedMarked) return

        this.selfDependedMarked = true

        for (const selfDependentIden of this.baseRevision.selfDependent) {
            const existing  = this.entries.get(selfDependentIden)

            if (existing && existing.getValue() === TombStone) continue

            this.touch(selfDependentIden)
        }
    }


    // onNewWrite () {
    //     this.writes.forEach(writeInfo => {
    //         const identifier    = writeInfo.identifier
    //
    //         identifier.write.call(identifier.context || identifier, identifier, this, null, ...writeInfo.proposedArgs)
    //     })
    //
    //     this.writes.length = 0
    // }


    /** Returns the quark currently being computed (top of the [[activeStack]]). */
    getActiveEntry () : Quark {
        return this.activeStack[ this.activeStack.length - 1 ]

        // // `stackSync` is always empty, except when the synchronous "batch" is being processed
        // const activeStack   = this.stackSync.length > 0 ? this.stackSync : this.stackGen
        //
        // return activeStack.last()
    }


    yieldAsync (effect : Effect) : Promise<any> {
        if (isPromise(effect)) return effect

        return this.graph[ effect.handler ](effect, this)
    }


    // see the comment for the `onEffectSync`
    yieldSync (effect : Effect) : any {
        if (isPromise(effect)) {
            throw new Error("Can not yield a promise in the synchronous context")
        }

        return this.graph[ effect.handler ](effect, this)
    }


    /**
     * Asynchronously reads the value of the given identifier. If the value has not yet been calculated,
     * schedules its computation. Supports both synchronous and asynchronous identifiers.
     *
     * @param identifier The identifier to read
     */
    readAsync<T> (identifier : Identifier<T>) : Promise<T> {
        // see the comment for the `onEffectSync`
        if (!(identifier instanceof Identifier)) return this.yieldAsync(identifier as Effect)

        let entry : Quark

        const activeEntry   = this.getActiveEntry()

        if (activeEntry) {
            entry           = this.addEdge(identifier, activeEntry, EdgeTypeNormal)
        } else {
            entry           = this.entries.get(identifier)

            if (!entry) {
                const previousEntry = this.baseRevision.getLatestEntryFor(identifier)

                if (!previousEntry) throwUnknownIdentifier(identifier)

                entry = previousEntry.hasValue() ? previousEntry : this.touch(identifier)
            }
        }

        if (entry.hasValue()) return entry.getValue()
        if (entry.promise) return entry.promise

        //----------------------
        // TODO should use `onReadIdentifier` somehow? to have the same control flow for reading sync/gen identifiers?
        // now need to repeat the logic
        if (!entry.previous || !entry.previous.hasValue()) entry.forceCalculation()

        return this.ongoing = entry.promise = this.ongoing.then(() => {
            return (async () => {
                //----------------------
                while (this.stackGen.lowestLevel < identifier.level) {
                    await runGeneratorAsyncWithEffect(this.onEffectAsync, this.calculateTransitionsStackGen, [ this.onEffectAsync, this.stackGen.takeLowestLevel() ], this)
                }

                if (this.rejectedWith) {
                    throw new Error(`Transaction rejected: ${ String(this.rejectedWith.reason) }`)
                }

                this.markSelfDependent()

                // entry might be already calculated (in the `ongoing` promise), so no need to calculate it
                if (entry.getValue() === undefined) {
                    await runGeneratorAsyncWithEffect(this.onEffectAsync, this.calculateTransitionsStackGen, [ this.onEffectAsync, [ entry ] ], this)
                }

                if (this.rejectedWith) {
                    throw new Error(`Transaction rejected: ${ String(this.rejectedWith.reason) }`)
                }

                // we clear the promise in the `resetToEpoch` should be enough?
                // entry.promise = undefined

                // TODO review this exception
                if (!entry.hasValue()) {
                    throw new Error('Computation cycle. Sync')
                }

                return entry.getValue()
            })()
        })
    }


    /**
     * Reads the value of the given identifier, returning synchronously if the identifier is sync
     * and returning a `Promise` if the identifier is async. Falls back to on-demand calculation
     * when the value is not yet available.
     *
     * @param identifier The identifier to read
     */
    get<T> (identifier : Identifier<T>) : T | Promise<T> {
        // see the comment for the `onEffectSync`
        if (!(identifier instanceof Identifier)) return this.yieldSync(identifier as Effect)

        let entry : Quark

        const activeEntry   = this.getActiveEntry()

        if (activeEntry) {
            entry           = this.addEdge(identifier, activeEntry, EdgeTypeNormal)
        } else {
            entry           = this.entries.get(identifier)

            if (!entry) {
                const previousEntry = this.baseRevision.getLatestEntryFor(identifier)

                if (!previousEntry) throwUnknownIdentifier(identifier)

                entry = previousEntry.hasValue() ? previousEntry : this.touch(identifier)
            }
        }

        const value1        = entry.getValue()

        if (value1 === TombStone) throwUnknownIdentifier(identifier)

        // the `&& entry.hasValue()` part was added to allow KEEP_TRYING_TO_RESOLVE feature for references
        if (value1 !== undefined && entry.hasValue()) return value1
        if (entry.promise) return entry.promise

        //----------------------
        // TODO should use `onReadIdentifier` somehow? to have the same control flow for reading sync/gen identifiers?
        // now need to repeat the logic
        if (!entry.previous || !entry.previous.hasValue()) entry.forceCalculation()

        // need to allow synchronous "gets" from stopped transaction
        // https://github.com/bryntum/support/issues/10703
        const wasStopped = this.stopped

        //----------------------
        while (this.stackGen.getLowestLevel() < identifier.level) {
            this.stopped = false
            // here we force the computations for lower level identifiers should be sync
            this.calculateTransitionsStackSync(this.onEffectSync, this.stackGen.takeLowestLevel())
            this.stopped = wasStopped
        }

        this.markSelfDependent()

        if (identifier.sync) {
            this.stopped = false
            this.calculateTransitionsStackSync(this.onEffectSync, [ entry ])
            this.stopped = wasStopped

            const value     = entry.getValue()

            // TODO review this exception
            if (value === undefined) throw new Error('Cycle during synchronous computation')
            if (value === TombStone) throwUnknownIdentifier(identifier)

            return value
        } else {
            const promise = this.ongoing = entry.promise = this.ongoing.then(() => {
                // entry might be already calculated (in the `ongoing` promise), so no need to calculate it
                if (entry.getValue() === undefined) return runGeneratorAsyncWithEffect(this.onEffectAsync, this.calculateTransitionsStackGen, [ this.onEffectAsync, [ entry ] ], this)
            }).then(() => {
                if (this.rejectedWith) throw new Error(`Transaction rejected: ${String(this.rejectedWith.reason)}`)

                // we clear the promise in the `resetToEpoch` should be enough?
                // entry.promise   = undefined

                const value     = entry.getValue()

                // TODO review this exception
                if (value === undefined) throw new Error('Computation cycle. Async get')
                if (value === TombStone) throwUnknownIdentifier(identifier)

                return value
                // // TODO review this exception
                // if (!entry.hasValue()) throw new Error('Computation cycle. Async get')
                //
                // return entry.getValue()
            })

            if (DEBUG) {
                // @ts-ignore
                promise.quark = entry
            }

            return promise



            // return runGeneratorAsyncWithEffect(this.onEffectAsync, this.calculateTransitionsStackGen, [ this.onEffectAsync, [ entry ] ], this).then(() => {
            //     const value     = entry.getValue()
            //
            //     // TODO review this exception
            //     if (value === undefined) throw new Error('Cycle during synchronous computation')
            //     if (value === TombStone) throwUnknownIdentifier(identifier)
            //
            //     return value
            // })
        }
    }


    /**
     * Synchronously reads the value of the given identifier. If the value is not yet calculated,
     * triggers on-demand synchronous computation. Throws if the identifier requires async computation.
     *
     * Also serves as the synchronous effect handler — when a non-Identifier effect is yielded,
     * it delegates to [[yieldSync]].
     *
     * @param identifier The identifier to read
     */
    read<T> (identifier : Identifier<T>) : T {
        // see the comment for the `onEffectSync`
        if (!(identifier instanceof Identifier)) return this.yieldSync(identifier as Effect)

        let entry : Quark

        const activeEntry   = this.getActiveEntry()

        if (activeEntry) {
            entry           = this.addEdge(identifier, activeEntry, EdgeTypeNormal)
        } else {
            entry           = this.entries.get(identifier)

            if (!entry) {
                const previousEntry = this.baseRevision.getLatestEntryFor(identifier)

                if (!previousEntry) throwUnknownIdentifier(identifier)

                entry = previousEntry.hasValue() ? previousEntry : this.touch(identifier)
            }
        }

        const value1        = entry.getValue()

        if (value1 === TombStone) throwUnknownIdentifier(identifier)
        if (value1 !== undefined) return value1

        // if (!identifier.sync) throw new Error("Can not calculate asynchronous identifier synchronously")

        // TODO should use `onReadIdentifier` somehow? to have the same control flow for reading sync/gen identifiers?
        // now need to repeat the logic
        if (!entry.previous || !entry.previous.hasValue()) entry.forceCalculation()

        //----------------------
        while (this.stackGen.getLowestLevel() < identifier.level) {
            this.calculateTransitionsStackSync(this.onEffectSync, this.stackGen.takeLowestLevel())
        }

        //----------------------
        this.markSelfDependent()

        this.calculateTransitionsStackSync(this.onEffectSync, [ entry ])

        const value     = entry.getValue()

        // TODO review this exception
        if (value === undefined) throw new Error('Cycle during synchronous computation')
        if (value === TombStone) throwUnknownIdentifier(identifier)

        return value
    }


    /**
     * Reads the most-fresh value for the identifier: first checks for a calculated value in the current
     * transaction, then a proposed (written but not yet calculated) value, and finally falls back
     * to the previous revision's value.
     *
     * @param identifier The identifier to read
     */
    readCurrentOrProposedOrPrevious<T> (identifier : Identifier<T>) : T {
        const dirtyQuark    = this.entries.get(identifier)

        if (dirtyQuark) {
            const value     = dirtyQuark.getValue()

            if (value !== undefined) return value

            if (dirtyQuark.proposedValue !== undefined) return dirtyQuark.proposedValue
        }

        return this.readPrevious(identifier)
    }


    readCurrentOrProposedOrPreviousAsync<T> (identifier : Identifier<T>) : Promise<T> {
        const dirtyQuark    = this.entries.get(identifier)

        if (dirtyQuark) {
            const value     = dirtyQuark.getValue()

            if (value !== undefined) return value

            if (dirtyQuark.proposedValue !== undefined) return dirtyQuark.proposedValue
        }

        return this.readPreviousAsync(identifier)
    }


    /** Reads the value of the identifier from the previous (base) revision. */
    readPrevious<T> (identifier : Identifier<T>) : T {
        const previousEntry = this.baseRevision.getLatestEntryFor(identifier)

        if (!previousEntry) return undefined

        const value         = previousEntry.getValue()

        return value !== TombStone ? (value === undefined && identifier.lazy ? this.read(identifier) : value) : undefined
    }


    readPreviousAsync<T> (identifier : Identifier<T>) : Promise<T> {
        const previousEntry = this.baseRevision.getLatestEntryFor(identifier)

        if (!previousEntry) return undefined

        const value         = previousEntry.getValue()

        return value !== TombStone ? (value !== undefined ? value : this.readAsync(identifier)) : undefined
    }


    /** Reads the proposed value if one exists, otherwise falls back to the previous revision's value. */
    readProposedOrPrevious<T> (identifier : Identifier<T>) : T {
        const dirtyQuark    = this.entries.get(identifier)

        if (dirtyQuark && dirtyQuark.proposedValue !== undefined) {
            return dirtyQuark.proposedValue
        } else {
            return this.readPrevious(identifier)
        }
    }


    readProposedOrPreviousAsync<T> (identifier : Identifier<T>) : Promise<T> {
        const dirtyQuark    = this.entries.get(identifier)

        if (dirtyQuark && dirtyQuark.proposedValue !== undefined) {
            return dirtyQuark.proposedValue
        } else {
            return this.readPreviousAsync(identifier)
        }
    }


    /**
     * Writes a proposed value to the given identifier in this transaction. The value will be processed
     * during the next [[commit]] or [[commitAsync]] call. Converts `undefined` to `null`.
     *
     * @param identifier The identifier to write to
     * @param proposedValue The value to propose
     * @param args Additional arguments passed to the identifier's write method
     */
    write (identifier : Identifier, proposedValue : any, ...args : any[]) {
        if (proposedValue === undefined) proposedValue = null

        // this.writes.push(WriteEffect.new({
        //     identifier      : identifier,
        //     proposedArgs    : [ proposedValue, ...args ]
        // }))
        //
        // this.onNewWrite()

        identifier.write.call(identifier.context || identifier, identifier, this, null, /*this.getWriteTarget(identifier),*/ proposedValue, ...args)

        const entry                     = this.entries.get(identifier)

        this.hasVariableEntry          = this.hasVariableEntry || (!entry.isShadow() && identifier.level === Levels.UserInput)
        this.hasEntryWithProposedValue = this.hasEntryWithProposedValue || entry.hasProposedValue()
    }


    // acquireQuark<T extends Identifier> (identifier : T) : InstanceType<T[ 'quarkClass' ]> {
    //     return this.touch(identifier).startOrigin() as InstanceType<T[ 'quarkClass' ]>
    // }


    getWriteTarget<T extends Identifier> (identifier : T) : InstanceType<T[ 'quarkClass' ]> {
        return this.touch(identifier).startOrigin() as InstanceType<T[ 'quarkClass' ]>
    }


    // return quark if it exists and is non-shadowing, otherwise undefined
    acquireQuarkIfExists<T extends Identifier> (identifier : T) : InstanceType<T[ 'quarkClass' ]> | undefined {
        const entry     = this.entries.get(identifier)

        return entry && entry.origin === entry ? entry.origin as InstanceType<T[ 'quarkClass' ]> : undefined
    }


    touch (identifier : Identifier) : Quark {
        const existingEntry         = this.entries.get(identifier)
        const { walkContext }       = this

        if (walkContext && (!existingEntry || existingEntry.visitEpoch < walkContext.currentEpoch)) {
            walkContext.continueFrom([ identifier ])
        }

        const entry                 = existingEntry || this.entries.get(identifier)

        entry.forceCalculation()

        return entry
    }


    // touchInvalidate (identifier : Identifier) : Quark {
    //     const existingEntry         = this.entries.get(identifier)
    //
    //     if (existingEntry && existingEntry.hasValue()) {
    //         this.walkContext.startNewEpoch()
    //     }
    //
    //     if (!existingEntry || existingEntry.visitEpoch < this.walkContext.currentEpoch) this.walkContext.continueFrom([ identifier ])
    //
    //     const entry                 = existingEntry || this.entries.get(identifier)
    //
    //     entry.forceCalculation()
    //
    //     return entry
    // }


    /**
     * Tests whether the given identifier exists in this transaction (either in the working set
     * or in the [[baseRevision]]). Returns `false` if the identifier has been removed (tombstoned).
     *
     * @param identifier
     */
    hasIdentifier (identifier : Identifier) : boolean {
        const activeEntry = this.entries.get(identifier)

        if (activeEntry && activeEntry.getValue() === TombStone) return false

        return Boolean(activeEntry || this.baseRevision.getLatestEntryFor(identifier))
    }


    /**
     * Adds a new identifier to this transaction. Optionally writes an initial proposed value.
     * This is an optimized version of [[write]] that skips the dependency graph walk phase,
     * since a newly added identifier is assumed to have no dependents yet.
     *
     * @param identifier The identifier to add
     * @param proposedValue Optional initial value
     * @param args Additional arguments passed to the identifier's write method
     */
    addIdentifier (identifier : Identifier, proposedValue? : any, ...args : any[]) : Quark {
        // however, the identifier may be already in the transaction, for example if the `write` method
        // of some other identifier writes to this identifier
        let entry : Quark           = this.entries.get(identifier)

        const alreadyHadEntry       = Boolean(entry)

        const isVariable            = identifier.level === Levels.UserInput

        if (!entry) {
            entry                   = identifier.newQuark(this.baseRevision)

            entry.previous          = this.baseRevision.getLatestEntryFor(identifier)

            entry.forceCalculation()

            this.entries.set(identifier, entry)
            if (!identifier.lazy && !isVariable) this.stackGen.push(entry)

            this.hasVariableEntry           = this.hasVariableEntry || (!entry.isShadow() && isVariable)
            this.hasEntryWithProposedValue  = this.hasEntryWithProposedValue || entry.hasProposedValue()
        }

        if (proposedValue !== undefined || isVariable) {
            // TODO change to `this.write()`
            entry.startOrigin()

            // we should not write if there's already an entry with some values (and we are trying to add it again)
            // this means there were some other identifier that has written into this one even before it was added
            // (probably in its `write` method)
            const shouldNotWrite   = alreadyHadEntry && (entry.proposedValue !== undefined || entry.value !== undefined)

            // however, if that entry contain TombStone marks, we should always write - means we are
            // actually re-adding the identifier, which has been removed in the same transaction
            if (!shouldNotWrite || entry.proposedValue === TombStone || entry.value === TombStone) {
                identifier.isWritingUndefined   = proposedValue === undefined
                identifier.write.call(identifier.context || identifier, identifier, this, entry, proposedValue === undefined && isVariable ? null : proposedValue, ...args)
                identifier.isWritingUndefined   = false
            }
        }

        // if we are re-adding the same identifier in the same transaction, clear the TombStone flag
        if (entry.getValue() === TombStone) entry.value = undefined
        if (entry.proposedValue === TombStone) entry.proposedValue = undefined

        identifier.enterGraph(this.graph)

        return entry
    }


    /**
     * Removes an identifier from this transaction by marking it with a tombstone value.
     * The identifier's [[Identifier.leaveGraph]] hook is called.
     *
     * @param identifier The identifier to remove
     */
    removeIdentifier (identifier : Identifier) {
        identifier.leaveGraph(this.graph)

        const entry                 = this.touch(identifier).startOrigin()

        entry.setValue(TombStone)

        // removing the identifier from self-dependent, otherwise there will be an attempt to evaluate it
        this.candidate.selfDependent.delete(identifier)
    }


    populateCandidateScopeFromTransitions (candidate : Revision, scope : Map<Identifier, Quark>) {
        if (candidate.scope.size === 0) {
            // in this branch we can overwrite the whole map
            candidate.scope     = scope
        } else {
            // in this branch candidate's scope already has some content - this is the case for calculating lazy values

            // // TODO benchmark what is faster (for small maps) - `map.forEach(entry => {})` or `for (const entry of map) {}`
            // entries.forEach((entry : QuarkEntry, identifier : Identifier) => {
            //     candidate.scope.set(identifier, entry)
            // })

            for (const [ identifier, quark ] of scope) {
                if (quark.isShadow()) {
                    const latestEntry   = candidate.getLatestEntryFor(identifier)

                    // TODO remove the origin/shadowing concepts? this line won't be needed then
                    // and we iterate over the edges from "origin" anyway
                    quark.getOutgoing().forEach((toQuark, toIdentifier) => latestEntry.getOutgoing().set(toIdentifier, toQuark))

                } else {
                    candidate.scope.set(identifier, quark)
                }
            }
        }
    }


    preCommit (args? : CommitArguments) {
        if (this.isClosed) throw new Error('Can not propagate closed revision')

        this.markSelfDependent()

        this.isClosed               = true
        this.propagationStartDate   = Date.now()

        this.plannedTotalIdentifiersToCalculate = this.stackGen.length
    }


    postCommit () : TransactionCommitResult {
        this.populateCandidateScopeFromTransitions(this.candidate, this.entries)

        // won't be available after next line
        const entries               = this.entries

        // for some reason need to cleanup the `walkContext` manually, otherwise the extra revisions hangs in memory
        this.walkContext            = undefined

        return { revision : this.candidate, entries, transaction : this }
    }


    /**
     * Synchronously commits this transaction. Walks the dependency graph, calculates all affected
     * strict identifiers, and produces a [[TransactionCommitResult]] containing the new revision.
     *
     * @param args Optional commit arguments
     */
    commit (args? : CommitArguments) : TransactionCommitResult {
        this.preCommit(args)

        this.calculateTransitionsSync(this.onEffectSync)
        // runGeneratorSyncWithEffect(this.onEffectSync, this.calculateTransitionsStackGen, [ this.onEffectSync, stack ], this)

        return this.postCommit()
    }


    /**
     * Rejects this transaction, discarding all pending changes. The graph will revert to its
     * [[baseRevision]] state. Sets [[rejectedWith]] to the given rejection effect.
     *
     * @param rejection The rejection effect (defaults to an empty [[RejectEffect]])
     */
    reject (rejection : RejectEffect<unknown> = RejectEffect.new()) {
        this.rejectedWith           = rejection

        this.walkContext            = undefined
    }


    // stops the calculations, but does not reject
    stop () {
        this.stopped                = true
    }


    clearRejected () {
        for (const quark of this.entries.values()) {
            quark.cleanup()
            // quark.clearOutgoing()
        }

        this.entries.clear()
    }


    // // propagation that does not use generators at all
    // propagateSync (args? : PropagateArguments) : TransactionPropagateResult {
    //     const stack = this.prePropagate(args)
    //
    //     this.calculateTransitionsStackSync(this.onEffectSync, stack)
    //     // runGeneratorSyncWithEffect(this.onEffectSync, this.calculateTransitionsStackGen, [ this.onEffectSync, stack ], this)
    //
    //     return this.postPropagate()
    // }


    /**
     * Asynchronously commits this transaction. Similar to [[commit]], but supports async identifier
     * calculations. Returns a promise that resolves to a [[TransactionCommitResult]].
     *
     * @param args Optional commit arguments
     */
    async commitAsync (args? : CommitArguments) : Promise<TransactionCommitResult> {
        this.preCommit(args)

        return this.ongoing = this.ongoing.then(() => {
            return runGeneratorAsyncWithEffect(this.onEffectAsync, this.calculateTransitions, [ this.onEffectAsync ], this)
        }).then(() => {
            return this.postCommit()
        })

        // await runGeneratorAsyncWithEffect(this.onEffectAsync, this.calculateTransitions, [ this.onEffectAsync ], this)
        //
        // return this.postCommit()
    }


    getLatestEntryFor (identifier : Identifier) : Quark {
        let entry : Quark             = this.entries.get(identifier) || this.baseRevision.getLatestEntryFor(identifier)

        if (entry && entry.getValue() === TombStone) return undefined

        return entry
    }


    getLatestStableOrProposedEntryFor (identifier : Identifier) : Quark {
        let entry : Quark       = this.entries.get(identifier)

        if (entry) {
            const value         = entry.getValue()

            if (value === TombStone) return undefined

            return value === undefined && entry.proposedValue === undefined ? this.baseRevision.getLatestEntryFor(identifier) : entry

        } else {
            return this.baseRevision.getLatestEntryFor(identifier)
        }
    }


    // check the transaction "entries" first, but only return an entry
    // from that, if it is already calculated, otherwise - take it
    // from the base revision
    getLatestStableEntryFor (identifier : Identifier) : Quark {
        let entry : Quark       = this.entries.get(identifier)

        if (entry) {
            const value         = entry.getValue()

            if (value === TombStone) return undefined

            return value === undefined ? this.baseRevision.getLatestEntryFor(identifier) : entry

        } else {
            return this.baseRevision.getLatestEntryFor(identifier)
        }
    }


    /**
     * Records a dependency edge from `identifierRead` to `activeEntry`. If no quark exists
     * for `identifierRead` in the transaction, a shadowing quark is created.
     *
     * @param identifierRead The identifier being read (dependency source)
     * @param activeEntry The quark currently being computed (dependency target)
     * @param type The edge type (Normal or Past)
     */
    addEdge (identifierRead : Identifier, activeEntry : Quark, type : EdgeType) : Quark {
        const identifier    = activeEntry.identifier

        if (identifier.level < identifierRead.level) throw new Error('Identifier can not read from higher level identifier')

        let entry : Quark             = this.entries.get(identifierRead)

        // creating "shadowing" entry, to store the new edges
        if (!entry) {
            const previousEntry = this.baseRevision.getLatestEntryFor(identifierRead)

            if (!previousEntry) throwUnknownIdentifier(identifierRead)

            entry               = identifierRead.newQuark(this.baseRevision)

            entry.setOrigin(previousEntry)
            entry.previous      = previousEntry

            this.entries.set(identifierRead, entry)
        }

        entry.addOutgoingTo(activeEntry, type)

        return entry
    }


    onQuarkCalculationCompleted (entry : Quark, value : any) {
        // cleanup the iterator
        entry.cleanup()

        const identifier    = entry.identifier
        const previousEntry = entry.previous

        //--------------------
        const sameAsPrevious    = Boolean(previousEntry && previousEntry.hasValue() && identifier.equality(value, previousEntry.getValue()))

        if (sameAsPrevious) {
            previousEntry.outgoingInTheFutureAndPastTransactionCb(this, previousOutgoingEntry => {
                const outgoingEntry = this.entries.get(previousOutgoingEntry.identifier)

                if (outgoingEntry) outgoingEntry.edgesFlow--
            })

            // this is a "workaround" for the following problem:
            // there might be several copies of the same quark in the calculation stack, this is normal
            // because if quark is requested by some other quark it is just pushed to the stack,
            // which may already contain this quark
            // then when the quark is calculated (this code) it propagates the `edgesFlow` decrease
            // but next time it will be encountered in the stack, its `edgesFlow` might be decreased by other
            // identifiers, which will trigger another round of `edgesFlow` decrease propagation
            // so we set the `edgesFlow` to MAX_SMI after decrease been propagated to prevent repeated such propagation
            entry.edgesFlow = MAX_SMI

            entry.setOrigin(previousEntry.origin)
        } else {
            entry.startOrigin()
            entry.setValue(value)
        }

        //--------------------
        let ignoreSelfDependency : boolean = false

        if (entry.usedProposedOrPrevious) {
            if (entry.proposedValue !== undefined) {
                if (identifier.equality(value, entry.proposedValue)) ignoreSelfDependency = true
            } else {
                // ignore the uninitialized atoms (`proposedValue` === undefined && !previousEntry)
                // which has been calculated to `null` - we don't consider this as a change
                if (sameAsPrevious || (!previousEntry && value === null)) ignoreSelfDependency = true
            }

            if (!ignoreSelfDependency) this.candidate.selfDependent.add(identifier)
        }
    }


    onReadIdentifier (identifierRead : Identifier, activeEntry : Quark, stack : Quark[]) : IteratorResult<any> | undefined | ComputationCycle {
        const requestedEntry            = this.addEdge(identifierRead, activeEntry, EdgeTypeNormal)

        // this is a workaround for references with failed resolution problem in gantt
        // those references return `hasValue() === false` even that they actually have value
        // (which is `null` and needed to be recalculated)
        if (requestedEntry.hasValue() || requestedEntry.value !== undefined) {
            const value                 = requestedEntry.getValue()

            if (value === TombStone) throwUnknownIdentifier(identifierRead)

            return activeEntry.continueCalculation(value)
        }
        else if (requestedEntry.isShadow()) {
            // shadow entry is shadowing a quark w/o value - it is still transitioning or lazy
            // in both cases start new calculation
            requestedEntry.startOrigin()
            requestedEntry.forceCalculation()

            stack.push(requestedEntry)

            return undefined
        }
        else {
            if (!requestedEntry.isCalculationStarted()) {
                stack.push(requestedEntry)

                if (!requestedEntry.previous || !requestedEntry.previous.hasValue()) requestedEntry.forceCalculation()

                return undefined
            }
            else {
                // cycle - the requested quark has started calculation (means it was encountered in the calculation loop before)
                // but the calculation did not complete yet (even that requested quark is calculated before the current)

                let cycle : ComputationCycle

                const walkContext = TransactionCycleDetectionWalkContext.new({
                    transaction         : this,
                    onCycle (node : Identifier, stack : WalkStep<Identifier>[]) : OnCycleAction {
                        cycle       = ComputationCycle.new({
                            cycle : cycleInfo(stack),
                            requestedEntry,
                            activeEntry,
                        })

                        return OnCycleAction.Cancel
                    }
                })

                walkContext.startFrom([ requestedEntry.identifier ])

                return cycle
            }
        }
    }


    * calculateTransitions (context : CalculationContext<any>) : Generator<any, void, unknown> {
        const queue                             = this.stackGen

        while (queue.length) {
            // TODO if stack calculation is interrupted with BreakCurrentStackExecution we might be loosing
            // some identifiers from the queue??
            yield* this.calculateTransitionsStackGen(context, queue.takeLowestLevel())
        }
    }


    calculateTransitionsSync (context : CalculationContext<any>) {
        const queue                             = this.stackGen

        while (queue.length) {
            this.calculateTransitionsStackSync(context, queue.takeLowestLevel())
        }
    }


    // this method is not decomposed into smaller ones intentionally, as that makes benchmarks worse
    // it seems that overhead of calling few more functions in such tight loop as this outweighs the optimization
    * calculateTransitionsStackGen (context : CalculationContext<any>, stack : Quark[]) : Generator<any, void, unknown> {
        if (this.rejectedWith || this.stopped) return

        this.walkContext.startNewEpoch()

        const entries                       = this.entries
        const propagationStartDate          = this.propagationStartDate

        const enableProgressNotifications   = this.graph ? this.graph.enableProgressNotifications : false

        let counter : number                = 0

        let prevActiveStack                 = this.activeStack

        this.activeStack = stack

        while (stack.length && !this.rejectedWith && !this.stopped) {
            if (enableProgressNotifications && !(counter++ % this.emitProgressNotificationsEveryCalculations)) {
                const now               = Date.now()
                const elapsed           = now - propagationStartDate

                if (elapsed > this.startProgressNotificationsAfterMs) {
                    const lastProgressNotificationDate      = this.lastProgressNotificationDate

                    if (!lastProgressNotificationDate || (now - lastProgressNotificationDate) > this.emitProgressNotificationsEveryMs) {
                        this.lastProgressNotificationDate   = now

                        this.graph.onPropagationProgressNotification({
                            total       : this.plannedTotalIdentifiersToCalculate,
                            remaining   : this.stackGen.length + stack.length,
                            phase       : 'propagating'
                        })

                        // need to "exit" the context of the current transaction for the time of the following `delay()`
                        // otherwise, any reads from graph during that time will be recorded as the dependencies
                        // of the currently active atom
                        this.activeStack = prevActiveStack

                        yield delay(0)

                        this.activeStack = stack
                    }
                }
            }

            if (this.rejectedWith || this.stopped) break

            const entry             = stack[ stack.length - 1 ]
            const identifier        = entry.identifier

            // TODO can avoid `.get()` call by comparing some another "epoch" counter on the entry
            const ownEntry          = entries.get(identifier)
            if (ownEntry !== entry) {
                entry.cleanup()

                stack.pop()
                continue
            }

            if (!identifier.ignoreEdgesFlow && entry.edgesFlow == 0) {
                // even if we delete the entry there might be other copies in stack, so reduce the `edgesFlow` to -1
                // to indicate that those are already processed
                entry.edgesFlow--

                const previousEntry = entry.previous

                previousEntry && previousEntry.outgoingInTheFutureAndPastTransactionCb(this, outgoing => {
                    const outgoingEntry     = entries.get(outgoing.identifier)

                    if (outgoingEntry) outgoingEntry.edgesFlow--
                })
            }

            // the "edgesFlow < 0" indicates that none of the incoming deps of this quark has changed
            // thus we don't need to calculate it, moreover, we can remove the quark from the `entries`
            // to expose the value from the previous revision
            // however, we only do it, when there is a quark from previous revision and it has "origin" (some value)
            if (!identifier.ignoreEdgesFlow && entry.edgesFlow < 0 && entry.previous && entry.previous.origin) {
                // even if the entry will be deleted from the transaction, we set the correct origin for it
                // this is because there might be other references to this entry in the stack
                // and also the entry may be referenced as dependency of some other quark
                // in such case the correct `originId` will preserve dependency during revisions compactification
                entry.setOrigin(entry.previous.origin)

                // if there's no outgoing edges we remove the quark
                if (entry.size === 0) {
                    entries.delete(identifier)
                }

                // reduce garbage collection workload
                entry.cleanup()

                stack.pop()
                continue
            }

            if (/*entry.isShadow() ||*/ entry.hasValue() || entry.proposedValue === TombStone) {
                entry.cleanup()

                stack.pop()
                continue
            }

            const startedAtEpoch    = entry.visitEpoch

            let iterationResult : IteratorResult<any>   = entry.isCalculationStarted() ? entry.iterationResult : entry.startCalculation(this.onEffectSync)

            while (iterationResult && !this.rejectedWith && !this.stopped) {
                const value         = iterationResult.value === undefined ? null : iterationResult.value

                if (entry.isCalculationCompleted()) {
                    if (entry.visitEpoch == startedAtEpoch) {
                        this.onQuarkCalculationCompleted(entry, value)
                    }

                    stack.pop()
                    break
                }
                else if (value instanceof Identifier) {
                    const onReadIdentifierResult = this.onReadIdentifier(value, entry, stack)

                    // handle the cycle
                    if (onReadIdentifierResult instanceof ComputationCycle) {
                        this.walkContext.startNewEpoch()

                        this.activeStack    = prevActiveStack

                        yield* this.graph.onComputationCycleHandler(onReadIdentifierResult)

                        prevActiveStack     = this.activeStack
                        this.activeStack    = stack

                        entry.cleanupCalculation()

                        iterationResult     = undefined
                    }
                    else {
                        iterationResult     = onReadIdentifierResult
                    }
                }
                else if (value === SynchronousCalculationStarted) {
                    // the fact, that we've encountered `SynchronousCalculationStarted` constant can mean 2 things:
                    // 1) there's a cycle during synchronous computation (we throw exception in `read` method)
                    // 2) some other computation is reading synchronous computation, that has already started
                    //    in such case its safe to just unwind the stack

                    stack.pop()
                    break
                }
                else {
                    // bypass the unrecognized effect to the outer context
                    const effectResult          = yield value

                    // the calculation can be interrupted (`cleanupCalculation`) as a result of the effect (WriteEffect)
                    // in such case we can not continue calculation and just exit the inner loop
                    if (effectResult === BreakCurrentStackExecution) break

                    // // the calculation can be interrupted (`cleanupCalculation`) as a result of the effect (WriteEffect)
                    // // in such case we can not continue calculation and just exit the inner loop
                    // if (entry.iterationResult)
                    if (entry.visitEpoch === startedAtEpoch) {
                        iterationResult         = entry.continueCalculation(effectResult)
                    } else {
                        stack.pop()
                        break
                    }
                    // else
                    //     iterationResult         = null
                }
            }
        }

        this.activeStack    = prevActiveStack
    }


    // THIS METHOD HAS TO BE KEPT SYNCED WITH THE `calculateTransitionsStackGen` !!!
    calculateTransitionsStackSync (context : CalculationContext<any>, stack : Quark[]) {
        if (this.rejectedWith || this.stopped) return

        this.walkContext.startNewEpoch()

        const entries                       = this.entries

        let prevActiveStack                 = this.activeStack

        this.activeStack                    = stack

        while (stack.length && !this.rejectedWith && !this.stopped) {
            const entry             = stack[ stack.length - 1 ]
            const identifier        = entry.identifier

            // TODO can avoid `.get()` call by comparing some another "epoch" counter on the entry
            const ownEntry          = entries.get(identifier)
            if (ownEntry !== entry) {
                entry.cleanup()

                stack.pop()
                continue
            }

            if (entry.edgesFlow == 0) {
                // even if we delete the entry there might be other copies in stack, so reduce the `edgesFlow` to -1
                // to indicate that those are already processed
                entry.edgesFlow--

                const previousEntry = entry.previous

                previousEntry && previousEntry.outgoingInTheFutureAndPastTransactionCb(this, outgoing => {
                    const outgoingEntry     = entries.get(outgoing.identifier)

                    if (outgoingEntry) outgoingEntry.edgesFlow--
                })
            }

            // the "edgesFlow < 0" indicates that none of the incoming deps of this quark has changed
            // thus we don't need to calculate it, moreover, we can remove the quark from the `entries`
            // to expose the value from the previous revision
            // however, we only do it, when there is a quark from previous revision and it has "origin" (some value)
            if (entry.edgesFlow < 0 && entry.previous && entry.previous.origin) {
                // even if the entry will be deleted from the transaction, we set the correct origin for it
                // this is because there might be other references to this entry in the stack
                // and also the entry may be referenced as dependency of some other quark
                // in such case the correct `originId` will preserve dependency during revisions compactification
                entry.setOrigin(entry.previous.origin)

                // if there's no outgoing edges we remove the quark
                if (entry.size === 0) {
                    entries.delete(identifier)
                }

                // reduce garbage collection workload
                entry.cleanup()

                stack.pop()
                continue
            }

            if (/*entry.isShadow() ||*/ entry.hasValue() || entry.proposedValue === TombStone) {
                entry.cleanup()

                stack.pop()
                continue
            }

            const startedAtEpoch    = entry.visitEpoch

            let iterationResult : IteratorResult<any>   = entry.isCalculationStarted() ? entry.iterationResult : entry.startCalculation(this.onEffectSync)

            while (iterationResult && !this.rejectedWith && !this.stopped) {
                const value         = iterationResult.value === undefined ? null : iterationResult.value

                if (entry.isCalculationCompleted()) {
                    if (entry.visitEpoch == startedAtEpoch) {
                        this.onQuarkCalculationCompleted(entry, value)
                    }

                    stack.pop()
                    break
                }
                else if (value instanceof Identifier) {
                    const onReadIdentifierResult = this.onReadIdentifier(value, entry, stack)

                    // handle the cycle
                    if (onReadIdentifierResult instanceof ComputationCycle) {
                        this.walkContext.startNewEpoch()

                        this.activeStack    = prevActiveStack

                        this.graph.onComputationCycleHandlerSync(onReadIdentifierResult, this)

                        prevActiveStack     = this.activeStack
                        this.activeStack    = stack

                        entry.cleanupCalculation()

                        iterationResult     = undefined
                    }
                    else {
                        iterationResult = onReadIdentifierResult
                    }
                }
                else if (value === SynchronousCalculationStarted) {
                    // the fact, that we've encountered `SynchronousCalculationStarted` constant can mean 2 things:
                    // 1) there's a cycle during synchronous computation (we throw exception in `read` method)
                    // 2) some other computation is reading synchronous computation, that has already started
                    //    in such case its safe to just unwind the stack

                    stack.pop()
                    break
                }
                else {
                    // bypass the unrecognized effect to the outer context
                    const effectResult          = context(value)

                    if (isPromise(effectResult))
                        throw new Error("Effect resolved to promise in the synchronous context, check that you marked the asynchronous calculations accordingly")

                    // the calculation can be interrupted (`cleanupCalculation`) as a result of the effect (WriteEffect)
                    // in such case we can not continue calculation and just exit the inner loop
                    if (effectResult === BreakCurrentStackExecution) break

                    // // the calculation can be interrupted (`cleanupCalculation`) as a result of the effect (WriteEffect)
                    // // in such case we can not continue calculation and just exit the inner loop
                    // if (entry.iterationResult)
                    if (entry.visitEpoch === startedAtEpoch) {
                        iterationResult         = entry.continueCalculation(effectResult)
                    } else {
                        stack.pop()
                        break
                    }
                    // else
                    //     iterationResult         = null
                }
            }
        }

        this.activeStack    = prevActiveStack
    }
}
