import { AnyConstructor, AnyFunction, Base, Mixin, MixinConstructor } from "../class/Mixin.js"
import { concat } from "../collection/Iterator.js"
import { CalculationContext, CalculationFunction, Context } from "../primitives/Calculation.js"
import { clearLazyProperty, copySetInto, lazyProperty } from "../util/Helpers.js"
import { ProgressNotificationEffect } from "./Effect.js"
import { CalculatedValueGen, Identifier, Variable } from "./Identifier.js"
import { TombStone } from "./Quark.js"
import { MinimalRevision, Revision } from "./Revision.js"
import { MinimalTransaction, Transaction, TransactionPropagateResult, YieldableValue } from "./Transaction.js"


//---------------------------------------------------------------------------------------------------------------------
export type PropagateArguments = {
    calculateOnly?      : Identifier[]
}

export type PropagateResult = {
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
export const Checkout = <T extends AnyConstructor<Base>>(base : T) =>

class Checkout extends base {
    // the revision currently being "checked out"
    baseRevision            : Revision      = undefined

    // the revision to follow to, when performing `redo` operation
    topRevision             : Revision      = undefined

    // how many revisions (except the `baseRevision`) to keep in memory for undo operation
    // minimal value is 0 (the `baseRevision` only, no undo/redo)
    // users supposed to opt-in for undo/redo by increasing this config
    historyLimit            : number        = 0

    listeners               : Map<Identifier, Listener> = new Map()

    runningTransaction      : Transaction

    enableProgressNotifications     : boolean   = false


    initialize (...args) {
        super.initialize(...args)

        if (!this.topRevision) this.topRevision = this.baseRevision

        this.markAndSweep()
    }


    clear () {
        this.baseRevision.scope.clear()
        this.baseRevision.previous  = null
        this.listeners.clear()

        this.baseRevision   = MinimalRevision.new()
        this.topRevision    = this.baseRevision

        clearLazyProperty(this, 'followingRevision')
        this._activeTransaction = undefined

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
                    else if (identifier.lazy && !entry.origin && prevQuark && prevQuark.origin && prevQuark.origin.usedProposedOrCurrent) {
                        // for lazy quarks, that depends on the `ProposedOrCurrent` effect, we need to save the value or proposed value
                        // from the previous revision
                        entry.startOrigin().proposedValue   = prevQuark.origin.value
                    }

                    entry.previous  = undefined

                    prevRev.scope.set(identifier, entry)
                }
            }

            copySetInto(newRev.selfDependent, prevRev.selfDependent)

            // some help for garbage collector
            newRev.scope.clear()
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


    _activeTransaction : Transaction    = undefined


    get activeTransaction () : Transaction {
        if (this._activeTransaction) return this._activeTransaction

        return this._activeTransaction = MinimalTransaction.new({
            baseRevision                : this.baseRevision,
            graph                       : this
        })
    }


    branch () : this {
        const Constructor = this.constructor as CheckoutConstructor

        return Constructor.new({ baseRevision : this.baseRevision }) as this
    }


    propagate (args? : PropagateArguments) : PropagateResult {
        const nextRevision      = this.activeTransaction.propagate(args)

        const result            = this.finalizePropagation(nextRevision)

        this.runningTransaction = null

        return result
    }


    propagateSync (args? : PropagateArguments) : PropagateResult {
        const nextRevision      = this.activeTransaction.propagateSync(args)

        const result            = this.finalizePropagation(nextRevision)

        this.runningTransaction = null

        return result
    }


    async propagateAsync (args? : PropagateArguments) : Promise<PropagateResult> {
        const nextRevision      = await this.activeTransaction.propagateAsync(args)

        const result            = this.finalizePropagation(nextRevision)

        await this.finalizePropagationAsync(nextRevision)

        this.runningTransaction = null

        return result
    }


    finalizePropagation (transactionResult : TransactionPropagateResult) : PropagateResult {
        const { revision, entries } = transactionResult

        if (revision.previous !== this.baseRevision) throw new Error('Invalid revisions chain')

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

        this.markAndSweep()

        clearLazyProperty(this, 'followingRevision')
        this._activeTransaction = undefined

        return
    }


    async finalizePropagationAsync (transactionResult : TransactionPropagateResult) {
    }



    variable (value : any) : Variable {
        const variable      = Variable.new()

        // always initialize variables with `null`
        return this.addIdentifier(variable, value === undefined ? null : value)
    }


    variableId (name : any, value : any) : Variable {
        const variable      = Variable.new({ name })

        // always initialize variables with `null`
        return this.addIdentifier(variable, value === undefined ? null : value)
    }


    identifier<ContextT extends Context> (calculation : CalculationFunction<ContextT, any, any, [ CalculationContext<any>, ...any[] ]>, context? : any) : Identifier {
        const identifier    = CalculatedValueGen.new({ calculation, context })

        return this.addIdentifier(identifier)
    }


    identifierId<ContextT extends Context> (name : any, calculation : CalculationFunction<ContextT, any, any, [ CalculationContext<any>, ...any[] ]>, context? : any) : Identifier {
        const identifier    = CalculatedValueGen.new({ calculation, context, name })

        return this.addIdentifier(identifier)
    }


    addIdentifier<T extends Identifier> (identifier : T, proposedValue? : any, ...args : any[]) : T {
        this.activeTransaction.addIdentifier(identifier, proposedValue, ...args)

        return identifier
    }


    removeIdentifier (identifier : Identifier) {
        identifier.leaveGraph(this)

        this.activeTransaction.removeIdentifier(identifier)

        this.listeners.delete(identifier)
    }


    hasIdentifier (identifier : Identifier) : boolean {
        return Boolean(this.baseRevision.getLatestEntryFor(identifier))
    }


    write<T> (identifier : Identifier<T>, proposedValue : T, ...args : any[]) {
        if (proposedValue === undefined) proposedValue = null

        identifier.write.call(identifier.context || identifier, identifier, this.activeTransaction, null, proposedValue, ...args)
    }


    // touch (identifier : Identifier) : Quark {
    //     return this.activeTransaction.touch(identifier)
    // }


    readIfExists (identifier : Identifier) : any {
        return this.baseRevision.readIfExists(identifier)
    }


    read<T> (identifier : Identifier<T>) : T {
        return this.baseRevision.read(identifier)
    }


    readDirty (identifier : Identifier) : any {
        return this.activeTransaction.readDirty(identifier)
    }


    acquireQuark<T extends Identifier> (identifier : T) : InstanceType<T[ 'quarkClass' ]> {
        // if (this.activeTransaction.isClosed) throw new Error("Can not acquire quark from closed transaction")

        return this.activeTransaction.touch(identifier).getOrigin() as InstanceType<T[ 'quarkClass' ]>
    }


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
        this._activeTransaction = undefined

        return true
    }


    redo () : boolean {
        const baseRevision      = this.baseRevision

        if (baseRevision === this.topRevision) return false

        const nextRevision      = this.followingRevision.get(baseRevision)

        this.baseRevision       = nextRevision

        // note: all unpropagated "writes" are lost
        this._activeTransaction = undefined

        return true
    }


    onPropagationProgressNotification (notification : ProgressNotificationEffect) {
    }
}

export type Checkout = Mixin<typeof Checkout>

export interface CheckoutI extends Mixin<typeof Checkout> {}

export type CheckoutConstructor = MixinConstructor<typeof Checkout>
