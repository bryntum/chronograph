import { Base } from "../class/Mixin.js"
import { CalculationIterator } from "./Calculation.js"


//---------------------------------------------------------------------------------------------------------------------
export class Identifier extends Base {
    id                  : any

    ArgsT               : any[]
    YieldT              : any
    ResultT             : any

    calculationContext  : any


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
        return value
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class Reference extends Identifier {
    ArgsT               : [ this[ 'ResultT' ], boolean ]

    YieldT              : ReturnType<typeof dereference>

    * calculation (value : this[ 'ResultT' ], isDereference : boolean) : CalculationIterator<this[ 'ResultT' ], this[ 'YieldT' ]> {
        if (isDereference) {
            return yield dereference(value)
        } else
            return value
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class ReferenceBucket extends Identifier {
    ArgsT               : [ this[ 'ResultT' ], boolean ]

    YieldT              : ReturnType<typeof dereference>

    * calculation (value : this[ 'ResultT' ], isDereference : boolean) : CalculationIterator<this[ 'ResultT' ], this[ 'YieldT' ]> {
        if (isDereference) {
            return yield dereference(value)
        } else
            return value
    }
}



const DereferenceSymbol = Symbol("DereferenceSymbol")

const dereference = (value : any) => { return { DereferenceSymbol, value } }
