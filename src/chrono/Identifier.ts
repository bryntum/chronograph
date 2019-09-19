import { Base, MixinConstructor } from "../class/Mixin.js"
import { CalculationContext, CalculationIterator } from "../primitives/Calculation.js"
import { prototypeValue } from "../util/Helpers.js"
import { Checkout, CheckoutI } from "./Checkout.js"
import { MinimalQuark, QuarkConstructor } from "./Quark.js"
import { QuarkTransition, QuarkTransitionGen, QuarkTransitionSync } from "./QuarkTransition.js"
import { ProposedOrCurrent, YieldableValue } from "./Transaction.js"


//---------------------------------------------------------------------------------------------------------------------
export class Identifier extends Base {
    name                : any

    ArgsT               : any[]
    YieldT              : YieldableValue
    ValueT              : any

    context             : any

    segment             : symbol
    level               : number    = 0

    @prototypeValue(false)
    lazy                : boolean

    @prototypeValue(MinimalQuark)
    quarkClass          : QuarkConstructor

    @prototypeValue(QuarkTransitionSync)
    transitionClass     : MixinConstructor<typeof QuarkTransition>


    equality (v1 : this[ 'ValueT' ], v2 : this[ 'ValueT' ]) : boolean {
        return v1 === v2
    }


    calculation (context : CalculationContext<this[ 'YieldT' ]>) : unknown {
        throw new Error("Abstract method `calculation` called")
    }


    // read (graph : CheckoutI) : this[ 'ValueT' ] {
    //     return graph.read(this)
    // }


    write (graph : CheckoutI, proposedValue : this[ 'ValueT' ], ...args : this[ 'ArgsT' ]) {
        const quark         = graph.acquireQuark(this)

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
export class Variable extends Identifier {
    YieldT              : never

    calculation (context : CalculationContext<this[ 'YieldT' ]>) : unknown {
        throw new Error("The 'calculation' method of the variables should not be called for optimization purposes. Instead the value should be set directly to quark")
    }


    write (graph : Checkout, proposedValue : this[ 'ValueT' ], ...args : this[ 'ArgsT' ]) {
        const quark         = graph.acquireQuark(this)

        quark.value         = proposedValue
    }
}

//---------------------------------------------------------------------------------------------------------------------
export class CalculatedValueSync extends Identifier {

    @prototypeValue(QuarkTransitionSync)
    transitionClass     : MixinConstructor<typeof QuarkTransition>

    calculation (YIELD : CalculationContext<this[ 'YieldT' ]>) : this[ 'ValueT' ] {
        return YIELD(ProposedOrCurrent)
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class CalculatedValueGen extends Identifier {

    @prototypeValue(QuarkTransitionGen)
    transitionClass     : MixinConstructor<typeof QuarkTransition>

    * calculation (context : CalculationContext<this[ 'YieldT' ]>) : CalculationIterator<this[ 'ValueT' ], this[ 'YieldT' ]> {
        return yield ProposedOrCurrent
    }
}
