import { AnyConstructor, Base, Mixin, MixinConstructor } from "../class/Mixin.js"
import { CalculationFunction, runSyncWithEffect } from "../primitives/Calculation.js"
import { Identifier, Variable } from "../primitives/Identifier.js"
import { clearLazyProperty, lazyProperty } from "../util/Helper.js"
import { calculateTransitions } from "./CalculationCore.js"
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

    historyLimit            : number        = 10

    checkout                : Scope


    initialize (...args) {
        super.initialize(...args)

        if (!this.checkout) this.checkout = this.baseRevision.buildLatest()

        if (!this.topRevision) this.topRevision = this.baseRevision
    }


    get nextRevision () : Map<Revision, Revision> {
        return lazyProperty<this, 'nextRevision'>(this, '_nextRevision', () => {
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
        const activeTransaction = clearLazyProperty(this, '_activeTransaction') as Transaction

        const nextRevision      = activeTransaction.propagate()

        this.baseRevision       = this.topRevision = nextRevision
        this.checkout           = this.includeRevisionToCheckout(this.checkout, nextRevision)

        clearLazyProperty(this, '_nextRevision')
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
            const quark         = MinimalQuark.new({ identifier })

            const transitions   = new Map<Identifier, QuarkTransition>()
            transitions.set(identifier, { previous : LazyQuarkMarker, current : quark, edgesFlow : 1e9 })

            runSyncWithEffect(
                x => x,
                calculateTransitions,
                [
                    {
                        stack           : [ quark ],
                        transitions     : transitions,

                        candidate       : this.baseRevision,
                        checkout        : this.checkout,
                        dimension       : Array.from(this.baseRevision.thisAndAllPrevious())
                    }
                ]
            )

            transitions.forEach((transition : QuarkTransition, identifier : Identifier) => {
                this.baseRevision.scope.set(identifier, transition.current)
                this.checkout.set(identifier, transition.current)
            })

            return quark.value
        } else {
            return latest.value
        }
    }


    undo () {
        const baseRevision      = this.baseRevision
        const previous          = baseRevision.previous

        if (!previous) return

        this.baseRevision       = previous
        // TODO switch `checkout` to lazy attribute to avoid costly `buildLatest` call if user just plays with undo/redo buttons
        this.checkout           = previous.buildLatest()
    }


    redo () {
        const baseRevision      = this.baseRevision

        if (baseRevision === this.topRevision) return

        const nextRevision      = this.nextRevision.get(baseRevision)

        this.baseRevision       = nextRevision
        this.checkout           = this.includeRevisionToCheckout(this.checkout, nextRevision)
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
