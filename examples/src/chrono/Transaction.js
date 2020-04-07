import { Base } from "../class/BetterMixin.js";
import { DEBUG } from "../environment/Debug.js";
import { cycleInfo, OnCycleAction } from "../graph/WalkDepth.js";
import { runGeneratorAsyncWithEffect, SynchronousCalculationStarted } from "../primitives/Calculation.js";
import { delay } from "../util/Helpers.js";
import { LeveledQueue } from "../util/LeveledQueue.js";
import { BreakCurrentStackExecution, RejectEffect } from "./Effect.js";
import { Identifier, Levels, throwUnknownIdentifier } from "./Identifier.js";
import { EdgeType, TombStone } from "./Quark.js";
import { Revision } from "./Revision.js";
import { ComputationCycle, TransactionCycleDetectionWalkContext } from "./TransactionCycleDetectionWalkContext.js";
import { TransactionWalkDepth } from "./TransactionWalkDepth.js";
//---------------------------------------------------------------------------------------------------------------------
// weird stack overflow on 1300 deep benchmark, when using `EdgeType.Normal` w/o aliasing it to constant first
export const EdgeTypeNormal = EdgeType.Normal;
export const EdgeTypePast = EdgeType.Past;
//---------------------------------------------------------------------------------------------------------------------
export class Transaction extends Base {
    constructor() {
        super(...arguments);
        this.baseRevision = undefined;
        this.candidateClass = Revision;
        this.candidate = undefined;
        this.graph = undefined;
        this.isClosed = false;
        this.walkContext = undefined;
        this.entries = new Map();
        // // we use 2 different stacks, because they support various effects
        // stackSync               : LeveledQueue<Quark>  = new LeveledQueue()
        // the `stackGen` supports async effects notably
        this.stackGen = new LeveledQueue();
        // is used for tracking the active quark entry (quark entry being computed)
        this.activeStack = [];
        this.onEffectSync = undefined;
        this.onEffectAsync = undefined;
        //---------------------
        this.propagationStartDate = 0;
        this.lastProgressNotificationDate = 0;
        this.startProgressNotificationsAfterMs = 500;
        this.emitProgressNotificationsEveryMs = 200;
        // TODO auto-adjust this parameter to match the emitProgressNotificationsEveryMs (to avoid calls to time functions)
        this.emitProgressNotificationsEveryCalculations = 100;
        this.plannedTotalIdentifiersToCalculate = 0;
        // writes                  : WriteInfo[]           = []
        this.ongoing = Promise.resolve();
        this.selfDependedMarked = false;
        this.rejectedWith = undefined;
    }
    initialize(...args) {
        super.initialize(...args);
        this.walkContext = TransactionWalkDepth.new({
            visited: this.entries,
            baseRevision: this.baseRevision,
            pushTo: this.stackGen
        });
        if (!this.candidate)
            this.candidate = this.candidateClass.new({ previous: this.baseRevision });
        // the `onEffectSync` should be bound to the `yieldSync` of course, and `yieldSync` should look like:
        //     yieldSync (effect : YieldableValue) : any {
        //         if (effect instanceof Identifier) return this.read(effect)
        //     }
        // however, the latter consumes more stack frames - every read goes through `yieldSync`
        // since `read` is the most used effect anyway, we bind `onEffectSync` to `read` and
        // instead inside of `read` delegate to `yieldSync` for non-identifiers
        this.onEffectSync = /*this.onEffectAsync =*/ this.read.bind(this);
        this.onEffectAsync = this.readAsync.bind(this);
    }
    get dirty() {
        return this.entries.size > 0;
    }
    markSelfDependent() {
        if (this.selfDependedMarked)
            return;
        this.selfDependedMarked = true;
        for (const selfDependentIden of this.baseRevision.selfDependent) {
            const existing = this.entries.get(selfDependentIden);
            if (existing && existing.getValue() === TombStone)
                continue;
            this.touch(selfDependentIden);
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
    getActiveEntry() {
        return this.activeStack[this.activeStack.length - 1];
        // // `stackSync` is always empty, except when the synchronous "batch" is being processed
        // const activeStack   = this.stackSync.length > 0 ? this.stackSync : this.stackGen
        //
        // return activeStack.last()
    }
    yieldAsync(effect) {
        if (effect instanceof Promise)
            return effect;
        // throw new Error("Effect resolved to promise in the synchronous context, check that you marked the asynchronous calculations accordingly")
        return this.graph[effect.handler](effect, this);
    }
    // see the comment for the `onEffectSync`
    yieldSync(effect) {
        return this.graph[effect.handler](effect, this);
    }
    // this seems to be an optimistic version
    async readAsync(identifier) {
        // see the comment for the `onEffectSync`
        if (!(identifier instanceof Identifier))
            return this.yieldAsync(identifier);
        //----------------------
        while (this.stackGen.lowestLevel < identifier.level) {
            await runGeneratorAsyncWithEffect(this.onEffectAsync, this.calculateTransitionsStackGen, [this.onEffectAsync, this.stackGen.takeLowestLevel()], this);
        }
        let entry;
        const activeEntry = this.getActiveEntry();
        if (activeEntry) {
            entry = this.addEdge(identifier, activeEntry, EdgeTypeNormal);
        }
        else {
            entry = this.entries.get(identifier);
            if (!entry)
                return this.baseRevision.readAsync(identifier, this.graph);
        }
        if (entry.hasValue())
            return entry.getValue();
        if (entry.promise)
            return entry.promise;
        //----------------------
        // TODO should use `onReadIdentifier` somehow? to have the same control flow for reading sync/gen identifiers?
        // now need to repeat the logic
        if (!entry.previous || !entry.previous.hasValue())
            entry.forceCalculation();
        this.markSelfDependent();
        return this.ongoing = entry.promise = this.ongoing.then(() => {
            // entry might be already calculated (in the `ongoing` promise), so no need to calculate it
            if (entry.getValue() === undefined)
                return runGeneratorAsyncWithEffect(this.onEffectAsync, this.calculateTransitionsStackGen, [this.onEffectAsync, [entry]], this);
        }).then(() => {
            if (this.rejectedWith)
                throw new Error(`Transaction rejected: ${String(this.rejectedWith.reason)}`);
            // we clear the promise in the `resetToEpoch` should be enough?
            // entry.promise = undefined
            // TODO review this exception
            if (!entry.hasValue())
                throw new Error('Computation cycle. Sync');
            return entry.getValue();
        });
    }
    get(identifier) {
        // see the comment for the `onEffectSync`
        if (!(identifier instanceof Identifier))
            return this.yieldSync(identifier);
        //----------------------
        while (this.stackGen.getLowestLevel() < identifier.level) {
            // here we force the computations for lower level identifiers should be sync
            this.calculateTransitionsStackSync(this.onEffectSync, this.stackGen.takeLowestLevel());
        }
        let entry;
        const activeEntry = this.getActiveEntry();
        if (activeEntry) {
            entry = this.addEdge(identifier, activeEntry, EdgeTypeNormal);
        }
        else {
            entry = this.entries.get(identifier);
            if (!entry)
                return this.baseRevision.get(identifier, this.graph);
        }
        const value1 = entry.getValue();
        if (value1 === TombStone)
            throwUnknownIdentifier(identifier);
        // the `&& entry.hasValue()` part was added to allow KEEP_TRYING_TO_RESOLVE feature for references
        if (value1 !== undefined && entry.hasValue())
            return value1;
        if (entry.promise)
            return entry.promise;
        //----------------------
        // TODO should use `onReadIdentifier` somehow? to have the same control flow for reading sync/gen identifiers?
        // now need to repeat the logic
        if (!entry.previous || !entry.previous.hasValue())
            entry.forceCalculation();
        this.markSelfDependent();
        if (identifier.sync) {
            this.calculateTransitionsStackSync(this.onEffectSync, [entry]);
            const value = entry.getValue();
            // TODO review this exception
            if (value === undefined)
                throw new Error('Cycle during synchronous computation');
            if (value === TombStone)
                throwUnknownIdentifier(identifier);
            return value;
        }
        else {
            const promise = this.ongoing = entry.promise = this.ongoing.then(() => {
                // entry might be already calculated (in the `ongoing` promise), so no need to calculate it
                if (entry.getValue() === undefined)
                    return runGeneratorAsyncWithEffect(this.onEffectAsync, this.calculateTransitionsStackGen, [this.onEffectAsync, [entry]], this);
            }).then(() => {
                if (this.rejectedWith)
                    throw new Error(`Transaction rejected: ${String(this.rejectedWith.reason)}`);
                // we clear the promise in the `resetToEpoch` should be enough?
                // entry.promise   = undefined
                const value = entry.getValue();
                // TODO review this exception
                if (value === undefined)
                    throw new Error('Computation cycle. Async get');
                if (value === TombStone)
                    throwUnknownIdentifier(identifier);
                return value;
                // // TODO review this exception
                // if (!entry.hasValue()) throw new Error('Computation cycle. Async get')
                //
                // return entry.getValue()
            });
            if (DEBUG) {
                // @ts-ignore
                promise.quark = entry;
            }
            return promise;
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
    // this seems to be an optimistic version
    read(identifier) {
        // see the comment for the `onEffectSync`
        if (!(identifier instanceof Identifier))
            return this.yieldSync(identifier);
        //----------------------
        while (this.stackGen.getLowestLevel() < identifier.level) {
            this.calculateTransitionsStackSync(this.onEffectSync, this.stackGen.takeLowestLevel());
        }
        let entry;
        const activeEntry = this.getActiveEntry();
        if (activeEntry) {
            entry = this.addEdge(identifier, activeEntry, EdgeTypeNormal);
        }
        else {
            entry = this.entries.get(identifier);
            if (!entry)
                return this.baseRevision.read(identifier, this.graph);
        }
        const value1 = entry.getValue();
        if (value1 === TombStone)
            throwUnknownIdentifier(identifier);
        if (value1 !== undefined)
            return value1;
        if (!identifier.sync)
            throw new Error("Can not calculate asynchronous identifier synchronously");
        // TODO should use `onReadIdentifier` somehow? to have the same control flow for reading sync/gen identifiers?
        // now need to repeat the logic
        if (!entry.previous || !entry.previous.hasValue())
            entry.forceCalculation();
        //----------------------
        this.markSelfDependent();
        this.calculateTransitionsStackSync(this.onEffectSync, [entry]);
        const value = entry.getValue();
        // TODO review this exception
        if (value === undefined)
            throw new Error('Cycle during synchronous computation');
        if (value === TombStone)
            throwUnknownIdentifier(identifier);
        return value;
    }
    // semantic is actually - read the most-fresh value
    readCurrentOrProposedOrPrevious(identifier) {
        const dirtyQuark = this.entries.get(identifier);
        if (dirtyQuark) {
            const value = dirtyQuark.getValue();
            if (value !== undefined)
                return value;
            if (dirtyQuark.proposedValue !== undefined)
                return dirtyQuark.proposedValue;
        }
        return this.baseRevision.readIfExists(identifier, this.graph);
    }
    readCurrentOrProposedOrPreviousAsync(identifier) {
        const dirtyQuark = this.entries.get(identifier);
        if (dirtyQuark) {
            const value = dirtyQuark.getValue();
            if (value !== undefined)
                return value;
            if (dirtyQuark.proposedValue !== undefined)
                return dirtyQuark.proposedValue;
        }
        return this.baseRevision.readIfExistsAsync(identifier, this.graph);
    }
    readProposedOrPrevious(identifier) {
        const dirtyQuark = this.entries.get(identifier);
        if (dirtyQuark && dirtyQuark.proposedValue !== undefined) {
            return dirtyQuark.proposedValue;
        }
        else
            return this.baseRevision.readIfExists(identifier, this.graph);
    }
    readProposedOrPreviousAsync(identifier) {
        const dirtyQuark = this.entries.get(identifier);
        if (dirtyQuark && dirtyQuark.proposedValue !== undefined) {
            return dirtyQuark.proposedValue;
        }
        else
            return this.baseRevision.readIfExistsAsync(identifier, this.graph);
    }
    write(identifier, proposedValue, ...args) {
        if (proposedValue === undefined)
            proposedValue = null;
        // this.writes.push(WriteEffect.new({
        //     identifier      : identifier,
        //     proposedArgs    : [ proposedValue, ...args ]
        // }))
        //
        // this.onNewWrite()
        identifier.write.call(identifier.context || identifier, identifier, this, null, /*this.getWriteTarget(identifier),*/ proposedValue, ...args);
    }
    // acquireQuark<T extends Identifier> (identifier : T) : InstanceType<T[ 'quarkClass' ]> {
    //     return this.touch(identifier).startOrigin() as InstanceType<T[ 'quarkClass' ]>
    // }
    getWriteTarget(identifier) {
        return this.touch(identifier).startOrigin();
    }
    // return quark if it exists and is non-shadowing, otherwise undefined
    acquireQuarkIfExists(identifier) {
        const entry = this.entries.get(identifier);
        return entry && entry.origin === entry ? entry.origin : undefined;
    }
    touch(identifier) {
        const existingEntry = this.entries.get(identifier);
        if (!existingEntry || existingEntry.visitEpoch < this.walkContext.currentEpoch)
            this.walkContext.continueFrom([identifier]);
        const entry = existingEntry || this.entries.get(identifier);
        entry.forceCalculation();
        return entry;
    }
    hasIdentifier(identifier) {
        return Boolean(this.entries.get(identifier) || this.baseRevision.getLatestEntryFor(identifier));
    }
    // this is actually an optimized version of `write`, which skips the graph walk phase
    // (since the identifier is assumed to be new, there should be no dependent quarks)
    addIdentifier(identifier, proposedValue, ...args) {
        // however, the identifier may be already in the transaction, for example if the `write` method
        // of some other identifier writes to this identifier
        let entry = this.entries.get(identifier);
        const isVariable = identifier.level === Levels.UserInput;
        if (!entry) {
            entry = identifier.newQuark(this.baseRevision);
            entry.previous = this.baseRevision.getLatestEntryFor(identifier);
            entry.forceCalculation();
            this.entries.set(identifier, entry);
            if (!identifier.lazy && !isVariable)
                this.stackGen.push(entry);
        }
        if (proposedValue !== undefined || isVariable) {
            // TODO change to `this.write()`
            entry.startOrigin();
            identifier.write.call(identifier.context || identifier, identifier, this, entry, proposedValue === undefined && isVariable ? null : proposedValue, ...args);
        }
        return entry;
    }
    removeIdentifier(identifier) {
        identifier.leaveGraph(this.graph);
        const entry = this.touch(identifier).startOrigin();
        entry.setValue(TombStone);
    }
    populateCandidateScopeFromTransitions(candidate, scope) {
        if (candidate.scope.size === 0) {
            // in this branch we can overwrite the whole map
            candidate.scope = scope;
        }
        else {
            // in this branch candidate's scope already has some content - this is the case for calculating lazy values
            // // TODO benchmark what is faster (for small maps) - `map.forEach(entry => {})` or `for (const entry of map) {}`
            // entries.forEach((entry : QuarkEntry, identifier : Identifier) => {
            //     candidate.scope.set(identifier, entry)
            // })
            for (const [identifier, quark] of scope) {
                if (quark.isShadow()) {
                    const latestEntry = candidate.getLatestEntryFor(identifier);
                    // TODO remove the origin/shadowing concepts? this line won't be needed then
                    // and we iterate over the edges from "origin" anyway
                    quark.getOutgoing().forEach((toQuark, toIdentifier) => latestEntry.getOutgoing().set(toIdentifier, toQuark));
                }
                else {
                    candidate.scope.set(identifier, quark);
                }
            }
        }
    }
    preCommit(args) {
        if (this.isClosed)
            throw new Error('Can not propagate closed revision');
        this.markSelfDependent();
        this.isClosed = true;
        this.propagationStartDate = Date.now();
        this.plannedTotalIdentifiersToCalculate = this.stackGen.length;
    }
    postCommit() {
        this.populateCandidateScopeFromTransitions(this.candidate, this.entries);
        // won't be available after next line
        const entries = this.entries;
        // for some reason need to cleanup the `walkContext` manually, otherwise the extra revisions hangs in memory
        this.walkContext = undefined;
        return { revision: this.candidate, entries, transaction: this };
    }
    commit(args) {
        this.preCommit(args);
        this.calculateTransitionsSync(this.onEffectSync);
        // runGeneratorSyncWithEffect(this.onEffectSync, this.calculateTransitionsStackGen, [ this.onEffectSync, stack ], this)
        return this.postCommit();
    }
    reject(rejection = RejectEffect.new()) {
        this.rejectedWith = rejection;
        for (const quark of this.entries.values()) {
            quark.cleanup();
            // quark.clearOutgoing()
        }
        this.entries.clear();
        this.walkContext = undefined;
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
    async commitAsync(args) {
        this.preCommit(args);
        return this.ongoing = this.ongoing.then(() => {
            return runGeneratorAsyncWithEffect(this.onEffectAsync, this.calculateTransitions, [this.onEffectAsync], this);
        }).then(() => {
            return this.postCommit();
        });
        // await runGeneratorAsyncWithEffect(this.onEffectAsync, this.calculateTransitions, [ this.onEffectAsync ], this)
        //
        // return this.postCommit()
    }
    getLatestEntryFor(identifier) {
        let entry = this.entries.get(identifier) || this.baseRevision.getLatestEntryFor(identifier);
        if (entry.getValue() === TombStone)
            return undefined;
        return entry;
    }
    addEdge(identifierRead, activeEntry, type) {
        const identifier = activeEntry.identifier;
        if (identifier.level < identifierRead.level)
            throw new Error('Identifier can not read from higher level identifier');
        let entry = this.entries.get(identifierRead);
        // creating "shadowing" entry, to store the new edges
        if (!entry) {
            const previousEntry = this.baseRevision.getLatestEntryFor(identifierRead);
            if (!previousEntry)
                throwUnknownIdentifier(identifierRead);
            entry = identifierRead.newQuark(this.baseRevision);
            previousEntry.origin && entry.setOrigin(previousEntry.origin);
            entry.previous = previousEntry;
            this.entries.set(identifierRead, entry);
        }
        entry.addOutgoingTo(activeEntry, type);
        return entry;
    }
    onQuarkCalculationCompleted(entry, value) {
        // cleanup the iterator
        entry.cleanup();
        const identifier = entry.identifier;
        const previousEntry = entry.previous;
        //--------------------
        const sameAsPrevious = Boolean(previousEntry && previousEntry.hasValue() && identifier.equality(value, previousEntry.getValue()));
        if (sameAsPrevious) {
            previousEntry.outgoingInTheFutureAndPastCb(this.baseRevision, previousOutgoingEntry => {
                const outgoingEntry = this.entries.get(previousOutgoingEntry.identifier);
                if (outgoingEntry)
                    outgoingEntry.edgesFlow--;
            });
            entry.setOrigin(previousEntry.origin);
            // seems not needed anymore?
            // this is to indicate that this entry should be recalculated (origin removed)
            // see `resetToEpoch`
            entry.value = value;
        }
        else {
            entry.startOrigin();
            entry.setValue(value);
        }
        //--------------------
        let ignoreSelfDependency = false;
        if (entry.usedProposedOrPrevious) {
            if (entry.proposedValue !== undefined) {
                if (identifier.equality(value, entry.proposedValue))
                    ignoreSelfDependency = true;
            }
            else {
                // ignore the uninitialized atoms (`proposedValue` === undefined && !previousEntry)
                // which has been calculated to `null` - we don't consider this as a change
                if (sameAsPrevious || (!previousEntry && value === null))
                    ignoreSelfDependency = true;
            }
            if (!ignoreSelfDependency)
                this.candidate.selfDependent.add(identifier);
        }
    }
    onReadIdentifier(identifierRead, activeEntry, stack) {
        const requestedEntry = this.addEdge(identifierRead, activeEntry, EdgeTypeNormal);
        // this is a workaround for references with failed resolution problem in gantt
        // those references return `hasValue() === false` even that they actually have value
        // (which is `null` and needed to be recalculated)
        if (requestedEntry.hasValue() || requestedEntry.value !== undefined) {
            const value = requestedEntry.getValue();
            if (value === TombStone)
                throwUnknownIdentifier(identifierRead);
            return activeEntry.continueCalculation(value);
        }
        else if (requestedEntry.isShadow()) {
            // shadow entry is shadowing a quark w/o value - it is still transitioning or lazy
            // in both cases start new calculation
            requestedEntry.startOrigin();
            requestedEntry.forceCalculation();
            stack.push(requestedEntry);
            return undefined;
        }
        else {
            if (!requestedEntry.isCalculationStarted()) {
                stack.push(requestedEntry);
                if (!requestedEntry.previous || !requestedEntry.previous.hasValue())
                    requestedEntry.forceCalculation();
                return undefined;
            }
            else {
                // cycle - the requested quark has started calculation (means it was encountered in the calculation loop before)
                // but the calculation did not complete yet (even that requested quark is calculated before the current)
                let cycle;
                const walkContext = TransactionCycleDetectionWalkContext.new({
                    transaction: this,
                    onCycle(node, stack) {
                        cycle = ComputationCycle.new({ cycle: cycleInfo(stack) });
                        return OnCycleAction.Cancel;
                    }
                });
                walkContext.startFrom([requestedEntry.identifier]);
                const exception = new Error("Computation cycle:\n" + cycle);
                //@ts-ignore
                exception.cycle = cycle;
                throw exception;
            }
        }
    }
    *calculateTransitions(context) {
        const queue = this.stackGen;
        while (queue.length) {
            yield* this.calculateTransitionsStackGen(context, queue.takeLowestLevel());
        }
    }
    calculateTransitionsSync(context) {
        const queue = this.stackGen;
        while (queue.length) {
            this.calculateTransitionsStackSync(context, queue.takeLowestLevel());
        }
    }
    // this method is not decomposed into smaller ones intentionally, as that makes benchmarks worse
    // it seems that overhead of calling few more functions in such tight loop as this outweighs the optimization
    *calculateTransitionsStackGen(context, stack) {
        if (this.rejectedWith)
            return;
        this.walkContext.startNewEpoch();
        const entries = this.entries;
        const propagationStartDate = this.propagationStartDate;
        const enableProgressNotifications = this.graph ? this.graph.enableProgressNotifications : false;
        let counter = 0;
        const prevActiveStack = this.activeStack;
        this.activeStack = stack;
        while (stack.length && !this.rejectedWith) {
            if (enableProgressNotifications && !(counter++ % this.emitProgressNotificationsEveryCalculations)) {
                const now = Date.now();
                const elapsed = now - propagationStartDate;
                if (elapsed > this.startProgressNotificationsAfterMs) {
                    const lastProgressNotificationDate = this.lastProgressNotificationDate;
                    if (!lastProgressNotificationDate || (now - lastProgressNotificationDate) > this.emitProgressNotificationsEveryMs) {
                        this.lastProgressNotificationDate = now;
                        this.graph.onPropagationProgressNotification({
                            total: this.plannedTotalIdentifiersToCalculate,
                            remaining: stack.length,
                            phase: 'propagating'
                        });
                        yield delay(0);
                    }
                }
            }
            const entry = stack[stack.length - 1];
            const identifier = entry.identifier;
            // TODO can avoid `.get()` call by comparing some another "epoch" counter on the entry
            const ownEntry = entries.get(identifier);
            if (ownEntry !== entry) {
                entry.cleanup();
                stack.pop();
                continue;
            }
            if (entry.edgesFlow == 0) {
                // even if we delete the entry there might be other copies in stack, so reduce the `edgesFlow` to -1
                // to indicate that those are already processed
                entry.edgesFlow--;
                const previousEntry = entry.previous;
                previousEntry && previousEntry.outgoingInTheFutureAndPastCb(this.baseRevision, outgoing => {
                    const outgoingEntry = entries.get(outgoing.identifier);
                    if (outgoingEntry)
                        outgoingEntry.edgesFlow--;
                });
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
                entry.setOrigin(entry.previous.origin);
                // if there's no outgoing edges we remove the quark
                if (entry.size === 0) {
                    entries.delete(identifier);
                }
                // reduce garbage collection workload
                entry.cleanup();
                stack.pop();
                continue;
            }
            if ( /*entry.isShadow() ||*/entry.hasValue() || entry.proposedValue === TombStone) {
                entry.cleanup();
                stack.pop();
                continue;
            }
            const startedAtEpoch = entry.visitEpoch;
            let iterationResult = entry.isCalculationStarted() ? entry.iterationResult : entry.startCalculation(this.onEffectSync);
            while (iterationResult) {
                const value = iterationResult.value === undefined ? null : iterationResult.value;
                if (entry.isCalculationCompleted()) {
                    if (entry.visitEpoch == startedAtEpoch) {
                        this.onQuarkCalculationCompleted(entry, value);
                    }
                    stack.pop();
                    break;
                }
                else if (value instanceof Identifier) {
                    iterationResult = this.onReadIdentifier(value, entry, stack);
                }
                else if (value === SynchronousCalculationStarted) {
                    // the fact, that we've encountered `SynchronousCalculationStarted` constant can mean 2 things:
                    // 1) there's a cycle during synchronous computation (we throw exception in `read` method)
                    // 2) some other computation is reading synchronous computation, that has already started
                    //    in such case its safe to just unwind the stack
                    stack.pop();
                    break;
                }
                else {
                    // bypass the unrecognized effect to the outer context
                    const effectResult = yield value;
                    // the calculation can be interrupted (`cleanupCalculation`) as a result of the effect (WriteEffect)
                    // in such case we can not continue calculation and jare ust exit the inner loop
                    if (effectResult === BreakCurrentStackExecution)
                        break;
                    // // the calculation can be interrupted (`cleanupCalculation`) as a result of the effect (WriteEffect)
                    // // in such case we can not continue calculation and just exit the inner loop
                    // if (entry.iterationResult)
                    iterationResult = entry.continueCalculation(effectResult);
                    // else
                    //     iterationResult         = null
                }
            }
        }
        this.activeStack = prevActiveStack;
    }
    // THIS METHOD HAS TO BE KEPT SYNCED WITH THE `calculateTransitionsStackGen` !!!
    calculateTransitionsStackSync(context, stack) {
        if (this.rejectedWith)
            return;
        this.walkContext.startNewEpoch();
        const entries = this.entries;
        const prevActiveStack = this.activeStack;
        this.activeStack = stack;
        while (stack.length && !this.rejectedWith) {
            const entry = stack[stack.length - 1];
            const identifier = entry.identifier;
            // TODO can avoid `.get()` call by comparing some another "epoch" counter on the entry
            const ownEntry = entries.get(identifier);
            if (ownEntry !== entry) {
                entry.cleanup();
                stack.pop();
                continue;
            }
            if (entry.edgesFlow == 0) {
                // even if we delete the entry there might be other copies in stack, so reduce the `edgesFlow` to -1
                // to indicate that those are already processed
                entry.edgesFlow--;
                const previousEntry = entry.previous;
                previousEntry && previousEntry.outgoingInTheFutureAndPastCb(this.baseRevision, outgoing => {
                    const outgoingEntry = entries.get(outgoing.identifier);
                    if (outgoingEntry)
                        outgoingEntry.edgesFlow--;
                });
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
                entry.setOrigin(entry.previous.origin);
                // if there's no outgoing edges we remove the quark
                if (entry.size === 0) {
                    entries.delete(identifier);
                }
                // reduce garbage collection workload
                entry.cleanup();
                stack.pop();
                continue;
            }
            if ( /*entry.isShadow() ||*/entry.hasValue() || entry.proposedValue === TombStone) {
                entry.cleanup();
                stack.pop();
                continue;
            }
            const startedAtEpoch = entry.visitEpoch;
            let iterationResult = entry.isCalculationStarted() ? entry.iterationResult : entry.startCalculation(this.onEffectSync);
            while (iterationResult) {
                const value = iterationResult.value === undefined ? null : iterationResult.value;
                if (entry.isCalculationCompleted()) {
                    if (entry.visitEpoch == startedAtEpoch) {
                        this.onQuarkCalculationCompleted(entry, value);
                    }
                    stack.pop();
                    break;
                }
                else if (value instanceof Identifier) {
                    iterationResult = this.onReadIdentifier(value, entry, stack);
                }
                else if (value === SynchronousCalculationStarted) {
                    // the fact, that we've encountered `SynchronousCalculationStarted` constant can mean 2 things:
                    // 1) there's a cycle during synchronous computation (we throw exception in `read` method)
                    // 2) some other computation is reading synchronous computation, that has already started
                    //    in such case its safe to just unwind the stack
                    stack.pop();
                    break;
                }
                else {
                    // bypass the unrecognized effect to the outer context
                    const effectResult = context(value);
                    if (effectResult instanceof Promise)
                        throw new Error("Effect resolved to promise in the synchronous context, check that you marked the asynchronous calculations accordingly");
                    // the calculation can be interrupted (`cleanupCalculation`) as a result of the effect (WriteEffect)
                    // in such case we can not continue calculation and just exit the inner loop
                    if (effectResult === BreakCurrentStackExecution)
                        break;
                    // // the calculation can be interrupted (`cleanupCalculation`) as a result of the effect (WriteEffect)
                    // // in such case we can not continue calculation and just exit the inner loop
                    // if (entry.iterationResult)
                    iterationResult = entry.continueCalculation(effectResult);
                    // else
                    //     iterationResult         = null
                }
            }
        }
        this.activeStack = prevActiveStack;
    }
}
