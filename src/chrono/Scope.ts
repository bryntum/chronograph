import { AnyConstructor, Base, Mixin, MixinConstructor } from "../class/Mixin.js"
import { CalculationFunction } from "../primitives/Calculation.js"
import { Identifier, Variable } from "../primitives/Identifier.js"
import { clearLazyProperty, lazyProperty } from "../util/Helper.js"
import { Quark } from "./Quark.js"
import { Revision } from "./Revision.js"
import { MinimalTransaction, Transaction } from "./Transaction.js"


//---------------------------------------------------------------------------------------------------------------------
export const Scope = <T extends AnyConstructor<Base>>(base : T) =>

class Scope extends base {
    baseRevision            : Revision

    bottomRevision          : Revision
    topRevision             : Revision

    historyLimit            : number        = 10

    baseRevisionLatest      : Map<Identifier, Quark>


    get nextRevision () : Map<Revision, Revision> {
        return lazyProperty<this, 'nextRevision'>(this, '_nextRevision', () => {
            const revisions     = Array.from(this.topRevision.thisAndAllPrevious()).reverse()

            const entries : [ Revision, Revision ][]    = []

            for (let i = 0; i < revisions.length - 1; i++)
                entries.push([ revisions[ i ], revisions[ i + 1 ] ])

            return new Map(entries)
        })
    }


    initialize (...args) {
        super.initialize(...args)

        // copy/create the latest cache
        this.baseRevisionLatest = this.baseRevision.buildLatest()

        // provide the cache to revision, so that other scopes can benefit from it
        if (!this.baseRevision.latest) this.baseRevision.latest = this.baseRevisionLatest

        if (!this.topRevision) this.topRevision = this.baseRevision


    }


    get activeTransaction () : Transaction {
        return lazyProperty<this, 'activeTransaction'>(
            this, '_activeTransaction', () => MinimalTransaction.new({ baseRevision : this.baseRevision })
        )
    }


    branch () : this {
        const Constructor = this.constructor as ScopeConstructor

        return Constructor.new({ baseRevision : this.baseRevision }) as this
    }


    propagate () {
        const activeTransaction = clearLazyProperty(this, '_activeTransaction') as Transaction

        // take the cache back, only if it was created by this scope
        if (this.baseRevision.latest === this.baseRevisionLatest) this.baseRevision.latest = undefined

        const nextRevision              = activeTransaction.propagate(this.baseRevisionLatest)

        this.baseRevision               = this.topRevision = nextRevision
        this.baseRevisionLatest         = nextRevision.latest = nextRevision.includeScopeToLatest(this.baseRevisionLatest)

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

        // take the cache back, only if it was created by this scope
        if (baseRevision.latest === this.baseRevisionLatest) baseRevision.latest = undefined

        this.baseRevision           = previous
        this.baseRevisionLatest     = previous.latest = previous.buildLatest()
    }


    redo () {
        const baseRevision      = this.baseRevision

        if (baseRevision === this.topRevision) return

        const nextRevision      = this.nextRevision.get(baseRevision)

        // take the cache back, only if it was created by this scope
        if (baseRevision.latest === this.baseRevisionLatest) baseRevision.latest = undefined

        this.baseRevision       = nextRevision
        this.baseRevisionLatest = nextRevision.latest = nextRevision.includeScopeToLatest(this.baseRevisionLatest)
    }
}

export type Scope = Mixin<typeof Scope>

type ScopeConstructor = MixinConstructor<typeof Scope>
