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

    baseRevisionLatest      : Map<Identifier, Quark>


    initialize (...args) {
        super.initialize(...args)

        // copy/create the latest cache
        this.baseRevisionLatest = this.baseRevision.buildLatest()

        // provide the cache to revision, so that other scopes can benefit from it
        if (!this.baseRevision.latest) this.baseRevision.latest = this.baseRevisionLatest
    }


    get activeTransaction () : Transaction {
        return lazyProperty<this, 'activeTransaction'>(
            this, '_activeTransaction', () => MinimalTransaction.new({ baseRevision : this.baseRevision })
        )
    }


    derive () : this {
        const Constructor = this.constructor as ScopeConstructor

        return Constructor.new({ baseRevision : this.baseRevision }) as this
    }


    propagate () {
        const activeTransaction = clearLazyProperty(this, '_activeTransaction') as Transaction

        // take the cache back, if it was created by this scope
        if (this.baseRevision.latest === this.baseRevisionLatest) {
            this.baseRevision.latest    = undefined
        }

        this.baseRevision               = activeTransaction.propagate(this.baseRevisionLatest)

        this.baseRevision.latest        = this.baseRevision.includeScopeToLatest(this.baseRevisionLatest)
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
}

export type Scope = Mixin<typeof Scope>

type ScopeConstructor = MixinConstructor<typeof Scope>
