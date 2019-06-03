import { AnyConstructor, Base, Mixin, MixinConstructor } from "../class/Mixin.js"
import { CalculationFunction } from "../primitives/Calculation.js"
import { Identifier, Variable } from "../primitives/Identifier.js"
import { Branch } from "../primitives/Branch.js"
import { clearLazyProperty, lazyProperty } from "../util/Helper.js"
import { MinimalTransaction, Transaction } from "./Transaction.js"

const Source = MinimalTransaction.new({ isFrozen : true })

//---------------------------------------------------------------------------------------------------------------------
export const ChronoGraph = <T extends AnyConstructor<Branch>>(base : T) =>

class ChronoGraph extends base {
    NodeT                   : Transaction

    source                  : Transaction   = Source


    get activeTransaction () : Transaction {
        return lazyProperty<this, 'activeTransaction'>(
            this, '_activeTransaction', () => MinimalTransaction.new({ previous : this.headNode(), branch : this })
        )
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
        return this.headNode().read(identifier)
    }


    propagate () {
        this.activeTransaction.propagate()

        this.addNode(this.activeTransaction)

        clearLazyProperty(this, '_activeTransaction')
    }
}

export type ChronoGraph = Mixin<typeof ChronoGraph>
// export interface ChronoGraphI extends Mixin<typeof ChronoGraph> {
//     NodeT                   : Transaction
// }

export class MinimalChronoGraph extends ChronoGraph(Branch(Base)) {
    NodeT                   : Transaction
}

type ChronoGraphConstructor = MixinConstructor<typeof ChronoGraph>
