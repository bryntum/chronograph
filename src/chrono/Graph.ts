import { AnyConstructor, Base, Mixin, MixinConstructor } from "../class/Mixin.js"
import { Graph, MinimalGraph } from "../graph/Graph.js"
import { CalculationFunction } from "../primitives/Calculation.js"
import { Identifier, Variable } from "../primitives/Identifier.js"
import { RevisionId, revisionId } from "../primitives/Revision.js"
import { clearLazyProperty, lazyProperty } from "../util/Helper.js"
import { MinimalTransaction, Transaction } from "./Transaction.js"


//---------------------------------------------------------------------------------------------------------------------
export const ChronoGraph = <T extends AnyConstructor<Base & Graph>>(base : T) =>

class ChronoGraph extends base {
    NodeT                   : Transaction

    currentTransaction      : Transaction               = MinimalTransaction.new({ isFrozen : true })


    get activeTransaction () : Transaction {
        return lazyProperty<this, 'activeTransaction'>(
            this, '_activeTransaction', () => MinimalTransaction.new({ previous : this.currentTransaction })
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
        return this.currentTransaction.read(identifier)
    }


    propagate () {
        this.activeTransaction.propagate()

        this.addNode(this.activeTransaction)

        this.currentTransaction     = this.activeTransaction

        clearLazyProperty(this, '_activeTransaction')
    }


    branch () : ChronoGraph {
        const Constructor = this.constructor as ChronoGraphConstructor

        return Constructor.new({
            currentTransaction      : this.currentTransaction
        })
    }
}

export type ChronoGraph = Mixin<typeof ChronoGraph>
// export interface ChronoGraphI extends Mixin<typeof ChronoGraph> {
//     NodeT                   : Transaction
// }

export class MinimalChronoGraph extends ChronoGraph(MinimalGraph) {
    NodeT                   : Transaction
}

type ChronoGraphConstructor = MixinConstructor<typeof ChronoGraph>
