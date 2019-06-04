import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { Identifier } from "../primitives/Identifier.js"
import { ChronoGraph } from "./Graph.js"
import { Quark } from "./Quark.js"
import { Scope } from "./Scope.js"
import { Transaction } from "./Transaction.js"


//---------------------------------------------------------------------------------------------------------------------
export const Checkout = <T extends AnyConstructor<Scope>>(base : T) =>

class Checkout extends base {

    baseBranch              : ChronoGraph
    baseTransaction         : Transaction

    cache                   : Map<Identifier, Quark> = new Map()



    get activeTransaction () : Transaction {
        if (this.baseTransaction === this.baseBranch.headNode()) return this.baseBranch.activeTransaction
    }


    read (identifier : Identifier) : any {
        const quarkInScope  = this.cache.get(identifier)

        if (quarkInScope) return quarkInScope.value

        const quark         = this.baseTransaction.getLatestQuarkFor(identifier)

        this.cache.set(identifier, quark)

        return quark.value
    }


    commit (transaction : Transaction) {
        if (transaction.previous !== this.baseTransaction) throw new Error("Can only commit the succeeding transaction")
        if (transaction.branch !== this.baseBranch) throw new Error("Can only commit from base branch")

        transaction.scope.forEach((quarkTransition, identifier) => this.cache.set(identifier, quarkTransition.current))
    }


    reset (branch : ChronoGraph) {
        this.baseBranch     = branch

        this.cache.clear()
    }
}

export type Checkout = Mixin<typeof Checkout>

export class MinimalCheckout extends Checkout(Scope(Base)) {}
