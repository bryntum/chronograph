import { Base } from "../class/Mixin.js"
import { CalculationIterator } from "./Calculation.js"


//---------------------------------------------------------------------------------------------------------------------
export class Identifier extends Base {
    ArgsT               : any[]
    YieldT              : any
    ValueT              : any

    calculationContext  : any

    * calculation (...args : this[ 'ArgsT' ]) : CalculationIterator<this[ 'ValueT' ], this[ 'YieldT' ]> {
        throw new Error("Abstract method `calculation` called")
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class Variable extends Identifier {
    ArgsT               : [ this[ 'ValueT' ] ]

    YieldT              : never

    * calculation (value : this[ 'ValueT' ]) : CalculationIterator<this[ 'ValueT' ], this[ 'YieldT' ]> {
        return value
    }
}


