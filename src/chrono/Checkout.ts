import { AnyConstructor, Base, Mixin, MixinConstructor } from "../class/Mixin.js"
import { CalculationFunction } from "../primitives/Calculation.js"
import { Identifier, Variable } from "../primitives/Identifier.js"
import { clearLazyProperty, lazyProperty } from "../util/Helper.js"
import { Quark } from "./Quark.js"
import { Revision } from "./Revision.js"
import { MinimalTransaction, Transaction } from "./Transaction.js"


//---------------------------------------------------------------------------------------------------------------------
export const Checkout = <T extends AnyConstructor<Base>>(base : T) =>

class Checkout extends base {
    baseRevision            : Revision

    bottomRevision          : Revision
    topRevision             : Revision

    historyLimit            : number        = 10

    checkout                : Map<Identifier, Quark>


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
        this.checkout           = this.includeScopeToLatest(this.checkout, nextRevision)

        clearLazyProperty(this, '_nextRevision')
    }


    variable (value : any) : Variable {
        const variable      = Variable.new()

        this.write(variable, value)

        return variable
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
        return this.baseRevision.read(identifier)
    }


    undo () {
        const baseRevision      = this.baseRevision
        const previous          = baseRevision.previous

        if (!previous) return

        this.baseRevision       = previous
        this.checkout           = previous.buildLatest()
    }


    redo () {
        const baseRevision      = this.baseRevision

        if (baseRevision === this.topRevision) return

        const nextRevision      = this.nextRevision.get(baseRevision)

        this.baseRevision       = nextRevision
        this.checkout           = this.includeScopeToLatest(this.checkout, nextRevision)
    }


    includeScopeToLatest (checkout : Map<Identifier, Quark>, revision : Revision) : Map<Identifier, Quark> {
        for (const [ identifier, quark ] of revision.scope) {
            checkout.set(identifier, quark)
        }

        return checkout
    }

}

export type Checkout = Mixin<typeof Checkout>

type CheckoutConstructor = MixinConstructor<typeof Checkout>
