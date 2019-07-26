import { Base } from "../class/Mixin.js"
import { CalculationIterator } from "./Calculation.js"


//---------------------------------------------------------------------------------------------------------------------
export class Identifier extends Base {
    id                  : any

    ArgsT               : any[]
    YieldT              : any
    ResultT             : any

    calculationContext  : any

    lazy                : boolean       = false


    equality (v1 : this[ 'ResultT' ], v2 : this[ 'ResultT' ]) : boolean {
        return v1 === v2
    }

    * calculation (...args : this[ 'ArgsT' ]) : CalculationIterator<this[ 'ResultT' ], this[ 'YieldT' ]> {
        throw new Error("Abstract method `calculation` called")
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class Variable extends Identifier {
    ArgsT               : [ this[ 'ResultT' ] ]

    YieldT              : never

    * calculation (value : this[ 'ResultT' ]) : CalculationIterator<this[ 'ResultT' ], this[ 'YieldT' ]> {
        throw new Error("The 'calculation' method of the variables should not be called for optimization purposes. Instead the value should be set directly to quark")
    }
}

