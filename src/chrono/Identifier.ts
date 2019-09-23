import { buildClass } from "../class/InstanceOf.js"
import { AnyConstructor, Base, MixinConstructor } from "../class/Mixin.js"
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
import { Quark } from "./Quark.js"
import { QuarkEntry, QuarkEntryConstructor } from "./QuarkEntry.js"
import { QuarkTransition, QuarkTransitionGen, QuarkTransitionSync } from "./QuarkTransition.js"
import { ProposedOrCurrent, Transaction, YieldableValue } from "./Transaction.js"


//---------------------------------------------------------------------------------------------------------------------
export class Identifier<ContextT extends Context = Context, ResultT = any> extends Base {
    name                : any       = null

    ArgsT               : any[]
    YieldT              : YieldableValue
    ValueT              : ResultT

    context             : any       = null

    segment             : symbol
    level               : number    = 0

    lazy                : boolean   = false

    // @prototypeValue(MinimalQuark)
    quarkClass          : QuarkEntryConstructor

    static entryClass   : QuarkEntryConstructor


    equality (v1 : this[ 'ValueT' ], v2 : this[ 'ValueT' ]) : boolean {
        return v1 === v2
    }


    calculation (context : CalculationContext<this[ 'YieldT' ]>) : Contexts<ResultT, this[ 'YieldT' ]>[ ContextT ] {
        throw new Error("Abstract method `calculation` called")
    }


    // read (graph : CheckoutI) : this[ 'ValueT' ] {
    //     return graph.read(this)
    // }


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

    static entryClass   : QuarkEntryConstructor = buildClass(Set, CalculationSync, QuarkEntry) as any


    calculation (context : CalculationContext<this[ 'YieldT' ]>) : Contexts<ResultT, this[ 'YieldT' ]>[ typeof ContextSync ] {
        throw new Error("The 'calculation' method of the variables should not be called for optimization purposes. Instead the value should be set directly to quark")
    }


    write (transaction : Transaction, proposedValue : this[ 'ValueT' ], ...args : this[ 'ArgsT' ]) {
        const quark         = transaction.acquireQuark(this)

        quark.value         = proposedValue
    }
}

//---------------------------------------------------------------------------------------------------------------------
export class CalculatedValueSync extends Identifier {

    static entryClass   : QuarkEntryConstructor = buildClass(Set, CalculationSync, QuarkEntry) as any


    calculation (YIELD : CalculationContext<this[ 'YieldT' ]>) : this[ 'ValueT' ] {
        return YIELD(ProposedOrCurrent)
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class CalculatedValueGen extends Identifier {
    // tslint:disable-next-line
    static entryClass   : QuarkEntryConstructor = buildClass(Set, CalculationGen, QuarkEntry) as any;


    * calculation (context : CalculationContext<this[ 'YieldT' ]>) : CalculationIterator<this[ 'ValueT' ], this[ 'YieldT' ]> {
        return yield ProposedOrCurrent
    }
}
