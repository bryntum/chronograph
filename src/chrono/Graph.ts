import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { Branch } from "../primitives/Branch.js"
import { clearLazyProperty, lazyProperty } from "../util/Helper.js"
import { Scope } from "./Scope.js"
import { MinimalTransaction, Transaction } from "./Transaction.js"

const Source = MinimalTransaction.new({ isFrozen : true })

//---------------------------------------------------------------------------------------------------------------------
export const ChronoGraph = <T extends AnyConstructor<Branch & Scope>>(base : T) =>

class ChronoGraph extends base {
    NodeT                   : Transaction

    source                  : Transaction   = Source


    get baseTransaction () : Transaction {
        return this.headNode()
    }


    get activeTransaction () : Transaction {
        return lazyProperty<this, 'activeTransaction'>(
            this, '_activeTransaction', () => MinimalTransaction.new({ previous : this.headNode(), branch : this })
        )
    }


    propagate () {
        this.activeTransaction.propagate()

        this.addNode(this.activeTransaction)

        clearLazyProperty(this, '_activeTransaction')
    }
}

export type ChronoGraph = Mixin<typeof ChronoGraph>

export class MinimalChronoGraph extends ChronoGraph(Scope(Branch(Base))) {
    NodeT                   : Transaction
}
