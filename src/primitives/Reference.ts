import { CalculationIterator } from "./Calculation.js"
import { Identifier } from "./Identifier.js"


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
