import { AnyConstructor, Base, Mixin, MixinConstructor } from "../class/Mixin.js"
import { concat } from "../collection/Iterator.js"
import { CalculationContext, CalculationFunctionGen } from "../primitives/Calculation.js"
import { clearLazyProperty, copyMapInto, copySetInto, lazyProperty } from "../util/Helpers.js"
import { CalculatedValueGen, Identifier, Variable } from "./Identifier.js"
import { Revision } from "./Revision.js"
import { MinimalTransaction, Transaction, YieldableValue } from "./Transaction.js"


//---------------------------------------------------------------------------------------------------------------------
export type PropagateArguments = {
    // observersFirst?     : boolean,
    calculateOnly?      : Identifier[]
}


// export class Listener extends Base {
//     handlers            : AnyFunction[]     = []
//
//     trigger (value : any) {
//         for (let i = 0; i < this.handlers.length; i++)
//             this.handlers[ i ](value)
//     }
// }


export const ObserverSegment = Symbol('ObserverSegment')


//---------------------------------------------------------------------------------------------------------------------
export const Checkout = <T extends AnyConstructor<Base>>(base : T) =>

class Checkout extends base {
    // the revision currently being "checked out"
    baseRevision            : Revision

    // the revision to follow to, when performing `redo` operation
    topRevision             : Revision

    // how many revisions (except the `baseRevision`) to keep in memory for undo operation
    // minimal value is 0 (the `baseRevision` only, no undo/redo)
    // users supposed to opt-in for undo/redo by increasing this config
    historyLimit            : number        = 0

    // listeners               : Map<Identifier, Listener> = new Map()


    initialize (...args) {
        super.initialize(...args)

        if (!this.topRevision) this.topRevision = this.baseRevision

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


    compactRevisions (revision : Revision, previous : Revision) {
        if (previous.reachableCount > 0 || revision.previous !== previous) throw new Error("Invalid compact operation")

        // we can only shred revision if its being reference maximum 1 time (from the current Checkout instance)
        if (previous.referenceCount <= 1) {
            copyMapInto(revision.scope, previous.scope)
            copySetInto(revision.selfDependentQuarks, previous.selfDependentQuarks)

            revision.scope          = previous.scope

            // make sure the previous revision won't be used inconsistently
            previous.scope          = null
        }
        // otherwise, we have to copy from it, and keep it intact
        else {
            revision.scope                  = new Map(concat(previous.scope, revision.scope))
            revision.selfDependentQuarks    = new Set(concat(previous.selfDependentQuarks, revision.selfDependentQuarks))

            previous.referenceCount--
        }

        // in both cases break the `previous` chain
        revision.previous           = null
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
        return lazyProperty(this, 'activeTransaction', () => MinimalTransaction.new({ baseRevision : this.baseRevision, checkout : this }))
    }


    branch () : this {
        const Constructor = this.constructor as CheckoutConstructor

        return Constructor.new({ baseRevision : this.baseRevision }) as this
    }


    propagate (args? : PropagateArguments) {
        const nextRevision      = this.activeTransaction.propagate(args)

        return this.finalizePropagation(nextRevision)
    }


    propagateSync (args? : PropagateArguments) {
        const nextRevision      = this.activeTransaction.propagateSync(args)

        return this.finalizePropagation(nextRevision)
    }


    async propagateAsync (args? : PropagateArguments) {
        const nextRevision      = await this.activeTransaction.propagateAsync(args)

        return this.finalizePropagation(nextRevision)
    }


    finalizePropagation (nextRevision : Revision) {
        if (nextRevision.previous !== this.baseRevision) throw new Error('Invalid revisions chain')

        // dereference all revisions
        for (const [ revision, isReachable ] of this.eachReachableRevision()) {
            if (isReachable) revision.reachableCount--

            revision.referenceCount--
        }

        // const previousRevision  = this.baseRevision

        this.baseRevision       = this.topRevision = nextRevision

        // activating listeners BEFORE the `markAndSweep`, because in that call, `baseRevision`
        // might be already merged with previous
        for (const [ identifier, quarkEntry ] of this.baseRevision.scope) {
            quarkEntry.cleanup(false)
            // // ignore "shadowing" entries
            // if (quarkEntry.sameAsPrevious || quarkEntry.previous && quarkEntry.quark === quarkEntry.previous.quark) continue
            //
            // const listener  = this.listeners.get(identifier)
            //
            // // TODO skip quarks with the values, equal to the previous (`sameAsPrevious` flag)
            // if (listener) listener.trigger(quarkEntry.value)
        }

        this.markAndSweep()

        clearLazyProperty(this, 'followingRevision')
        clearLazyProperty(this, 'activeTransaction')
    }


    variable (value : any) : Variable {
        const variable      = Variable.new()

        this.write(variable, value)

        return variable
    }


    addIdentifier<T extends Identifier> (identifier : T, proposedValue? : any, ...args : any[]) : T {
        this.touch(identifier)

        if (proposedValue !== undefined) identifier.write(this, proposedValue, ...args)

        return identifier
    }


    identifier (calculation : CalculationFunctionGen<any, any, [ CalculationContext<any>, ...any[] ]>, context? : any) : Identifier {
        const identifier    = CalculatedValueGen.new({ calculation, context })

        this.touch(identifier)

        return identifier
    }


    removeIdentifier (identifier : Identifier) {
        identifier.leaveGraph(this)

        return this.activeTransaction.removeIdentifier(identifier)
    }


    variableId (name : any, value : any) : Variable {
        const variable      = Variable.new({ name })

        this.write(variable, value)

        return variable
    }


    hasIdentifier (identifier : Identifier) : boolean {
        return Boolean(this.baseRevision.getLatestEntryFor(identifier))
    }


    identifierId (name : any, calculation : CalculationFunctionGen<any, any, [ CalculationContext<any>, ...any[] ]>, context? : any) : Identifier {
        const identifier    = CalculatedValueGen.new({ calculation, context, name })

        this.touch(identifier)

        return identifier
    }


    write (identifier : Identifier, proposedValue : any, ...args : any[]) {
        identifier.write(this, proposedValue, ...args)
    }


    touch (identifier : Identifier) {
        this.activeTransaction.touch(identifier)
    }


    read (identifier : Identifier) : any {
        return this.baseRevision.read(identifier)
    }


    acquireQuark<T extends Identifier> (identifier : T) : InstanceType<T[ 'quarkClass' ]> {
        // if (this.activeTransaction.isClosed) throw new Error("Can not acquire quark from closed transaction")

        return this.activeTransaction.touch(identifier).getQuark() as InstanceType<T[ 'quarkClass' ]>
    }


    observe
        <Result, Yield extends YieldableValue, ArgsT extends [ CalculationContext<Yield>, ...any[] ]>
        (observerFunc : CalculationFunctionGen<Result, Yield, ArgsT>/*, onUpdated : (value : Result) => any*/)
    {
        const identifier    = this.addIdentifier(CalculatedValueGen.new({
            calculation     : observerFunc as any,

            // equality        : () => false,

            // this is to be able to extract observer identifiers only
            segment         : ObserverSegment
        }))

        // return this.addListener(identifier, onUpdated)
    }


    // // TODO tie the type of `value` in the `onUpdated` to the `ValueT` in `identifier`
    // addListener (identifier : Identifier, onUpdated : (value : any) => any) {
    //     let listener    = this.listeners.get(identifier)
    //
    //     if (!listener) {
    //         listener    = Listener.new()
    //
    //         this.listeners.set(identifier, listener)
    //     }
    //
    //     listener.handlers.push(onUpdated)
    // }


    undo () : boolean {
        const baseRevision      = this.baseRevision
        const previous          = baseRevision.previous

        if (!previous) return false

        this.baseRevision       = previous

        // note: all unpropagated "writes" are lost
        clearLazyProperty(this, 'activeTransaction')

        return true
    }


    redo () : boolean {
        const baseRevision      = this.baseRevision

        if (baseRevision === this.topRevision) return false

        const nextRevision      = this.followingRevision.get(baseRevision)

        this.baseRevision       = nextRevision

        // note: all unpropagated "writes" are lost
        clearLazyProperty(this, 'activeTransaction')

        return true
    }
}

export type Checkout = Mixin<typeof Checkout>

export interface CheckoutI extends Checkout {}

export type CheckoutConstructor = MixinConstructor<typeof Checkout>
