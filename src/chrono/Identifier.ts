import { Base, MixinConstructor } from "../class/Mixin.js"
import { CalculationContext, CalculationIterator } from "../primitives/Calculation.js"
import { prototypeValue } from "../util/Helpers.js"
import { MinimalQuark, QuarkConstructor } from "./Quark.js"
import { QuarkTransition, QuarkTransitionGen, QuarkTransitionSync } from "./QuarkTransition.js"


//---------------------------------------------------------------------------------------------------------------------
export class Identifier extends Base {
    name                : any

    ArgsT               : [ CalculationContext<this[ 'YieldT' ]> ]
    YieldT              : any
    ValueT              : any

    context             : any

    @prototypeValue(false)
    lazy                : boolean

    @prototypeValue(MinimalQuark)
    quarkClass          : QuarkConstructor

    @prototypeValue(QuarkTransitionSync)
    transitionClass     : MixinConstructor<typeof QuarkTransition>


    equality (v1 : this[ 'ValueT' ], v2 : this[ 'ValueT' ]) : boolean {
        return v1 === v2
    }


    calculation (...args : this[ 'ArgsT' ]) : unknown {
        throw new Error("Abstract method `calculation` called")
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class Variable extends Identifier {
    YieldT              : never

    calculation (...args : this[ 'ArgsT' ]) : unknown {
        throw new Error("The 'calculation' method of the variables should not be called for optimization purposes. Instead the value should be set directly to quark")
    }
}

//---------------------------------------------------------------------------------------------------------------------
export class CalculatedValueSync extends Identifier {

    @prototypeValue(QuarkTransitionSync)
    transitionClass     : MixinConstructor<typeof QuarkTransition>

    calculation (context : CalculationContext<this[ 'YieldT' ]>) : this[ 'ValueT' ] {
        throw new Error("Abstract method `calculation` called")
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class CalculatedValueGen extends Identifier {

    @prototypeValue(QuarkTransitionGen)
    transitionClass     : MixinConstructor<typeof QuarkTransition>

    * calculation (context : CalculationContext<this[ 'YieldT' ]>) : CalculationIterator<this[ 'ValueT' ], this[ 'YieldT' ]> {
        throw new Error("Abstract method `calculation` called")
    }
}
