import { buildClass } from "../class/InstanceOf.js"
import { Base } from "../class/Mixin.js"
import {
    CalculationContext,
    CalculationGen,
    CalculationIterator,
    CalculationSync,
    Context,
    Contexts,
    ContextSync
} from "../primitives/Calculation.js"
import { prototypeValue } from "../util/Helpers.js"
import { CheckoutI } from "./Checkout.js"
import { QuarkEntry, QuarkEntryConstructor } from "./QuarkEntry.js"
import { ProposedOrCurrent, Transaction, YieldableValue } from "./Transaction.js"


//---------------------------------------------------------------------------------------------------------------------
export class Identifier<ContextT extends Context = Context, ValueT = any> extends Base {
    name                : any       = undefined

    ArgsT               : any[]
    YieldT              : YieldableValue
    ValueT              : ValueT

    context             : any       = undefined

    segment             : symbol
    level               : number    = 0

    lazy                : boolean   = false

    quarkClass          : QuarkEntryConstructor


    equality (v1 : this[ 'ValueT' ], v2 : this[ 'ValueT' ]) : boolean {
        return v1 === v2
    }


    calculation (context : CalculationContext<this[ 'YieldT' ]>) : Contexts<ValueT, this[ 'YieldT' ]>[ ContextT ] {
        throw new Error("Abstract method `calculation` called")
    }


    write (transaction : Transaction, proposedValue : this[ 'ValueT' ], ...args : this[ 'ArgsT' ]) {
        const quark         = transaction.acquireQuark(this)

        quark.proposedValue = proposedValue
    }


    // buildProposedValue (quark : InstanceType<this[ 'quarkClass' ]>) {
    //     return quark.proposedValue
    // }


    enterGraph (graph : CheckoutI) {
    }


    leaveGraph (graph : CheckoutI) {
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class Variable<ResultT = any> extends Identifier<typeof ContextSync, ResultT> {
    YieldT              : never

    @prototypeValue(buildClass(Set, CalculationSync, QuarkEntry))
    quarkClass          : QuarkEntryConstructor


    calculation (context : CalculationContext<this[ 'YieldT' ]>) : ResultT {
        throw new Error("The 'calculation' method of the variables should not be called for optimization purposes. Instead the value should be set directly to quark")
    }


    write (transaction : Transaction, proposedValue : this[ 'ValueT' ], ...args : this[ 'ArgsT' ]) {
        const quark         = transaction.acquireQuark(this)

        quark.value         = proposedValue
    }
}

//---------------------------------------------------------------------------------------------------------------------
export class CalculatedValueSync extends Identifier {

    @prototypeValue(buildClass(Set, CalculationSync, QuarkEntry))
    quarkClass          : QuarkEntryConstructor


    calculation (YIELD : CalculationContext<this[ 'YieldT' ]>) : this[ 'ValueT' ] {
        return YIELD(ProposedOrCurrent)
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class CalculatedValueGen extends Identifier {

    @prototypeValue(buildClass(Set, CalculationGen, QuarkEntry))
    quarkClass          : QuarkEntryConstructor


    * calculation (context : CalculationContext<this[ 'YieldT' ]>) : CalculationIterator<this[ 'ValueT' ], this[ 'YieldT' ]> {
        return yield ProposedOrCurrent
    }
}
