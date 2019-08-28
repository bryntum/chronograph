import { Base } from "../class/Mixin.js"
import { prototypeValue } from "../util/Helpers.js"
import { CalculationIterator } from "./Calculation.js"


//---------------------------------------------------------------------------------------------------------------------
export class Identifier extends Base {
    id                  : any

    ArgsT               : any[]
    YieldT              : any
    ValueT              : any

    calculationContext  : any

    @prototypeValue(false)
    lazy                : boolean


    equality (v1 : this[ 'ValueT' ], v2 : this[ 'ValueT' ]) : boolean {
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

    calculation (context : any) : this[ 'ValueT' ] {
        throw new Error("Abstract method `calculation` called")
    }
}


//---------------------------------------------------------------------------------------------------------------------
export const isGenSymbol  = Symbol('isGenSymbol')

export class CalculatedValueGen extends Identifier {
    [isGenSymbol] () {}

    * calculation () : CalculationIterator<this[ 'ValueT' ], this[ 'YieldT' ]> {
        throw new Error("Abstract method `calculation` called")
    }
}


//---------------------------------------------------------------------------------------------------------------------
export const isImpureGenSymbol  = Symbol('isImpureGenSymbol')

export class ImpureCalculatedValueGen extends Identifier {
    [isGenSymbol] () {}
    [isImpureGenSymbol] () {}

    * calculation (...args : this[ 'ArgsT' ]) : CalculationIterator<this[ 'ValueT' ], this[ 'YieldT' ]> {
        throw new Error("Abstract method `calculation` called")
    }
}

