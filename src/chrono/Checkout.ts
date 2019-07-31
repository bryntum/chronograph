import { AnyConstructor, Base, Mixin, MixinConstructor } from "../class/Mixin.js"
import { concat } from "../collection/Iterator.js"
import { CalculationFunction, runSyncWithEffect } from "../primitives/Calculation.js"
import { Identifier, Variable } from "../primitives/Identifier.js"
import { clearLazyProperty, lazyProperty } from "../util/Helper.js"
import { calculateTransitions, CalculationArgs } from "./CalculationCore.js"
import { LazyQuarkMarker, MinimalQuark, Quark } from "./Quark.js"
import { Revision } from "./Revision.js"
import { MinimalTransaction, QuarkTransition, Transaction } from "./Transaction.js"


export type QuarkEntry = Quark | LazyQuarkMarker

export type Scope   = Map<Identifier, QuarkEntry>

//---------------------------------------------------------------------------------------------------------------------
export const Checkout = <T extends AnyConstructor<Base>>(base : T) =>

class Checkout extends base {
    baseRevision            : Revision

    bottomRevision          : Revision
    topRevision             : Revision

    // how many revisions (including the `baseRevision`) to keep in memory for undo operation
    // minimal value is 1 (the `baseRevision` itself only)
    // users supposed to opt-in for undo/redo by increasing this config
    historyLimit            : number        = 1

    checkout                : Scope


    initialize (...args) {
        super.initialize(...args)

        if (!this.checkout) this.checkout = this.baseRevision.buildLatest()

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
            this.includeRevisionToCheckout(previous.scope, revision)

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
        return lazyProperty<this, 'followingRevision'>(this, '_followingRevision', () => {
            const revisions     = Array.from(this.topRevision.thisAndAllPrevious())

            const entries : [ Revision, Revision ][]    = []

            for (let i = revisions.length - 1; i > 0; i--)
                entries.push([ revisions[ i ], revisions[ i - 1 ] ])

            return new Map(entries)
        })
    }


    get activeTransaction () : Transaction {
        return lazyProperty<this, 'activeTransaction'>(
            this, '_activeTransaction', () => MinimalTransaction.new({ baseRevision : this.baseRevision, checkout : this.checkout })
        )
    }


    branch () : this {
        const Constructor = this.constructor as CheckoutConstructor

        return Constructor.new({ baseRevision : this.baseRevision, checkout : new Map(this.checkout) }) as this
    }


    propagate () {
        const activeTransaction : Transaction = clearLazyProperty(this, '_activeTransaction')

        const nextRevision      = activeTransaction.propagate()

        // dereference all revisions
        for (const [ revision, isReachable ] of this.eachReachableRevision()) {
            if (isReachable) revision.reachableCount--

            revision.referenceCount--
        }

        this.baseRevision       = this.topRevision = nextRevision
        this.checkout           = this.includeRevisionToCheckout(this.checkout, nextRevision)

        this.markAndSweep()

        clearLazyProperty(this, '_followingRevision')
    }


    variable (value : any) : Variable {
        const variable      = Variable.new()

        this.write(variable, value)

        return variable
    }


    addIdentifier (identifier : Identifier) : Identifier {
        this.touch(identifier)

        return identifier
    }


    identifier (calculation : CalculationFunction, calculationContext? : any) : Identifier {
        const identifier    = Identifier.new({ calculation, calculationContext })

        this.touch(identifier)

        return identifier
    }


    removeIdentifier (identifier : Identifier) {
        return this.activeTransaction.removeIdentifier(identifier)
    }


    variableId (id : any, value : any) : Variable {
        const variable      = Variable.new({ id })

        this.write(variable, value)

        return variable
    }


    identifierId (id : any, calculation : CalculationFunction, calculationContext? : any) : Identifier {
        const identifier    = Identifier.new({ calculation, calculationContext, id })

        this.touch(identifier)

        return identifier
    }


    write (variable : Variable, value : any) {
        return this.activeTransaction.write(variable, value)
    }


    touch (identifier : Identifier) {
        return this.activeTransaction.touch(identifier)
    }


    read (identifier : Identifier) : any {
        const latest    = this.baseRevision.getLatestQuarkFor(identifier)

        if (!latest) throw new Error("Unknown identifier")

        if (latest === LazyQuarkMarker) {
            return this.calculateLazyIdentifier(identifier)
        } else {
            return latest.value
        }
    }


    calculateLazyIdentifier (identifier : Identifier) : any {
        const quark         = MinimalQuark.new({ identifier })

        const transitions   = new Map<Identifier, QuarkTransition>()
        const transition : QuarkTransition = QuarkTransition.new({ identifier : identifier, previous : LazyQuarkMarker, current : quark, edgesFlow : 1e9 })

        transitions.set(identifier, transition)

        runSyncWithEffect<[ CalculationArgs ], any, any>(
            x => x,
            calculateTransitions,
            [
                {
                    stack           : [ transition ],
                    transitions     : transitions,

                    candidate       : this.baseRevision,
                    checkout        : this.checkout,
                    dimension       : Array.from(this.baseRevision.thisAndAllPrevious())
                }
            ]
        )

        transitions.forEach((transition : QuarkTransition, identifier : Identifier) => {
            this.baseRevision.scope.set(identifier, transition.current as QuarkEntry)
            this.checkout.set(identifier, transition.current as QuarkEntry)
        })

        return quark.value
    }


    undo () : boolean {
        const baseRevision      = this.baseRevision
        const previous          = baseRevision.previous

        if (!previous) return false

        this.baseRevision       = previous
        // TODO switch `checkout` to lazy attribute to avoid costly `buildLatest` call if user just plays with undo/redo buttons
        this.checkout           = previous.buildLatest()

        return true
    }


    redo () : boolean {
        const baseRevision      = this.baseRevision

        if (baseRevision === this.topRevision) return false

        const nextRevision      = this.followingRevision.get(baseRevision)

        this.baseRevision       = nextRevision
        this.checkout           = this.includeRevisionToCheckout(this.checkout, nextRevision)

        return true
    }


    includeRevisionToCheckout (checkout : Scope, revision : Revision) : Scope {
        for (const [ identifier, quark ] of revision.scope) {
            checkout.set(identifier, quark)
        }

        return checkout
    }

}

export type Checkout = Mixin<typeof Checkout>

export type CheckoutConstructor = MixinConstructor<typeof Checkout>
