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


    calculation (...args : this[ 'ArgsT' ]) : unknown {
        throw new Error("Abstract method `calculation` called")
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class Variable extends Identifier {

    calculation (...args : this[ 'ArgsT' ]) : any {
        throw new Error("The 'calculation' method of the variables should not be called for optimization purposes. Instead the value should be set directly to quark")
    }
}


//---------------------------------------------------------------------------------------------------------------------
export const isSyncSymbol  = Symbol('isSyncSymbol')

export class CalculatedValueSync extends Identifier {
    [isSyncSymbol] () {}

    calculation (context : any) : this[ 'ResultT' ] {
        throw new Error("Abstract method `calculation` called")
    }
}


//---------------------------------------------------------------------------------------------------------------------
export const isGenSymbol  = Symbol('isGenSymbol')

export class CalculatedValueGen extends Identifier {
    [isGenSymbol] () {}

    * calculation () : CalculationIterator<this[ 'ResultT' ], this[ 'YieldT' ]> {
        throw new Error("Abstract method `calculation` called")
    }
}


//---------------------------------------------------------------------------------------------------------------------
export const isImpureGenSymbol  = Symbol('isImpureGenSymbol')

export class ImpureCalculatedValueGen extends Identifier {
    [isImpureGenSymbol] () {}

    * calculation (...args : this[ 'ArgsT' ]) : CalculationIterator<this[ 'ResultT' ], this[ 'YieldT' ]> {
        throw new Error("Abstract method `calculation` called")
    }
}

