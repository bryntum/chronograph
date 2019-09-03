import { AnyConstructor, Base, Mixin, MixinConstructor } from "../class/Mixin.js"
import { concat } from "../collection/Iterator.js"
import { CalculationContext, CalculationGenFunction } from "../primitives/Calculation.js"
import { clearLazyProperty, copyMapInto, lazyProperty } from "../util/Helpers.js"
import { CalculatedValueGen, Identifier, Variable } from "./Identifier.js"
import { MinimalQuark } from "./Quark.js"
import { QuarkTransition } from "./QuarkTransition.js"
import { QuarkEntry, Revision, Scope } from "./Revision.js"
import { MinimalTransaction, Transaction } from "./Transaction.js"


//---------------------------------------------------------------------------------------------------------------------
export const Checkout = <T extends AnyConstructor<Base>>(base : T) =>

class Checkout extends base {
    // the revision currently being "checked out"
    baseRevision            : Revision

    // the revision to follow to, when performing `redo` operation
    topRevision             : Revision

    // how many revisions (including the `baseRevision`) to keep in memory for undo operation
    // minimal value is 1 (the `baseRevision` itself only, no undo/redo)
    // users supposed to opt-in for undo/redo by increasing this config
    historyLimit            : number        = 1

    // Possibly we don't need the `checkout` and `buildLatest` things at all - its not clear
    // what performance gain is provided by this caching (and building it is somewhat lengthy operation)
    // we could just do a series of the lookups on the `previous` axis
    // checkout                : Scope


    initialize (...args) {
        super.initialize(...args)

        // if (!this.checkout) this.checkout = this.baseRevision.buildLatest()

        if (!this.topRevision) this.topRevision = this.baseRevision

        this.markAndSweep()
    }


    * eachReachableRevision () : IterableIterator<[ Revision, boolean ]> {
        let isBetweenTopBottom      = true
        let counter                 = 0

        for (const revision of this.topRevision.thisAndAllPrevious()) {
            yield [ revision, isBetweenTopBottom || counter < this.historyLimit ]

            if (revision === this.baseRevision) {
                isBetweenTopBottom = false
                counter++
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

            revision.scope          = previous.scope

            // make sure the previous revision won't be used inconsistently
            previous.scope          = null
        }
        // otherwise, we have to copy from it, and keep it intact
        else {
            revision.scope          = new Map(concat(previous.scope.entries(), revision.scope.entries()))

            previous.referenceCount--
        }

        // in both cases break the `previous` chain
        revision.previous       = null
    }


    get followingRevision () : Map<Revision, Revision> {
        return lazyProperty(this, 'followingRevision', () => {
            const revisions     = Array.from(this.topRevision.thisAndAllPrevious())

            const entries : [ Revision, Revision ][]    = []

            for (let i = revisions.length - 1; i > 0; i--)
                entries.push([ revisions[ i ], revisions[ i - 1 ] ])

            return new Map(entries)
        })
    }


    get activeTransaction () : Transaction {
        return lazyProperty(
            this, 'activeTransaction', () => MinimalTransaction.new({ baseRevision : this.baseRevision })
        )
    }


    branch () : this {
        const Constructor = this.constructor as CheckoutConstructor

        return Constructor.new({ baseRevision : this.baseRevision/*, checkout : new Map(this.checkout)*/ }) as this
    }


    propagate () {
        const nextRevision      = this.activeTransaction.propagate()

        this.adoptNextRevision(nextRevision)
    }


    async propagateAsync () {
        // const nextRevision      = await this.activeTransaction.propagateAsync()
        //
        // this.adoptNextRevision(nextRevision)
    }


    adoptNextRevision (nextRevision : Revision) {
        if (nextRevision.previous !== this.baseRevision) throw new Error('Invalid revisions chain')

        // dereference all revisions
        for (const [ revision, isReachable ] of this.eachReachableRevision()) {
            if (isReachable) revision.reachableCount--

            revision.referenceCount--
        }

        this.baseRevision       = this.topRevision = nextRevision
        // copyMapInto(nextRevision.scope, this.checkout)

        this.markAndSweep()

        clearLazyProperty(this, 'followingRevision')
        clearLazyProperty(this, 'activeTransaction')
    }


    variable (value : any) : Variable {
        const variable      = Variable.new()

        this.write(variable, value)

        return variable
    }


    addIdentifier<T extends Identifier> (identifier : T) : T {
        this.touch(identifier)

        return identifier
    }


    identifier (calculation : CalculationGenFunction<any, any, [ CalculationContext<any>, ...any[] ]>, context? : any) : Identifier {
        const identifier    = CalculatedValueGen.new({ calculation, context })

        this.touch(identifier)

        return identifier
    }


    removeIdentifier (identifier : Identifier) {
        return this.activeTransaction.removeIdentifier(identifier)
    }


    variableId (name : any, value : any) : Variable {
        const variable      = Variable.new({ name })

        this.write(variable, value)

        return variable
    }


    identifierId (name : any, calculation : CalculationGenFunction<any, any, [ CalculationContext<any>, ...any[] ]>, context? : any) : Identifier {
        const identifier    = CalculatedValueGen.new({ calculation, context, name })

        this.touch(identifier)

        return identifier
    }


    // call (calculatedValue : ImpureCalculatedValueGen, ...args : any[]) {
    //     return this.activeTransaction.call(calculatedValue, args)
    // }


    write (variable : Identifier, value : any) {
        return this.activeTransaction.write(variable, value)
    }


    touch (identifier : Identifier) {
        return this.activeTransaction.touch(identifier)
    }


    read (identifier : Identifier) : any {
        const latest    = this.baseRevision.getLatestEntryFor(identifier)

        if (!latest) throw new Error("Unknown identifier")

        if (!latest.quark) {
            return this.calculateLazyIdentifier(identifier)
        } else {
            return latest.quark.value
        }
    }


    calculateLazyIdentifier (identifier : Identifier) : any {
        const quark         = MinimalQuark.new({ identifier })

        // MARKER
        // this manual preparations of the `transitions` and `stack` properties of the transaction can definitely be improved
        // possibly the `touch` method of the transaction can be smart and accept additional arguments,
        // like `deep` (whether to do walk depth), `forceStack` - whether to add identifier to stack even if its lazy)
        // I don't like when method becomes that smart though
        const transaction   = MinimalTransaction.new({ baseRevision : this.baseRevision, /*checkout : this.checkout,*/ candidate : this.baseRevision })

        const entry         = transaction.touch(identifier)

        transaction.stackGen   = [ entry ]
        // EOF MARKER

        const revision      = transaction.propagate()

        // transaction.transitions.forEach((transition : QuarkTransition, identifier : Identifier) => {
        //     this.checkout.set(identifier, transition.current as QuarkEntry)
        // })

        return quark.value
    }


    undo () : boolean {
        const baseRevision      = this.baseRevision
        const previous          = baseRevision.previous

        if (!previous) return false

        this.baseRevision       = previous
        // TODO switch `checkout` to lazy attribute to avoid costly `buildLatest` call if user just plays with undo/redo buttons
        // this.checkout           = previous.buildLatest()

        clearLazyProperty(this, 'activeTransaction')

        return true
    }


    redo () : boolean {
        const baseRevision      = this.baseRevision

        if (baseRevision === this.topRevision) return false

        const nextRevision      = this.followingRevision.get(baseRevision)

        this.baseRevision       = nextRevision
        // this.checkout           = copyMapInto(nextRevision.scope, this.checkout)

        clearLazyProperty(this, 'activeTransaction')

        return true
    }
}

export type Checkout = Mixin<typeof Checkout>

export type CheckoutConstructor = MixinConstructor<typeof Checkout>
