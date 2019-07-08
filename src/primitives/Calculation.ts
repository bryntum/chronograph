import { AnyConstructor, Mixin } from "../class/Mixin.js"
import { Box } from "./Box.js"


//---------------------------------------------------------------------------------------------------------------------
export type CalculationIterator<ResultT = any, YieldT = any> = IterableIterator<YieldT | ResultT>


//---------------------------------------------------------------------------------------------------------------------
export type CalculationFunction<ResultT = any, YieldT = any, ArgsT extends any[] = any[]> = (...args : ArgsT) => CalculationIterator<ResultT, YieldT>


//---------------------------------------------------------------------------------------------------------------------
export const Calculation = <T extends AnyConstructor<Box>>(base : T) =>

class Calculation extends base {
    ArgsT               : any[]
    YieldT              : any

    calculationContext  : any

    iterator            : CalculationIterator<this[ 'ValueT' ], this[ 'YieldT' ]>

    iterationResult     : IteratorResult<any>


    isCalculationStarted () : boolean {
        return Boolean(this.iterator || this.iterationResult)
    }


    isCalculationCompleted () : boolean {
        return Boolean(this.iterationResult && this.iterationResult.done)
    }


    get value () : this[ 'ValueT' ] {
        return this.iterationResult && this.iterationResult.done ? this.iterationResult.value : undefined
    }


    forceValue (value : this[ 'ValueT' ]) {
        this.iterationResult    = this.iterator ? this.iterator.return(value) : { value : value, done : true }
    }


    startCalculation (...args : this[ 'ArgsT' ]) : IteratorResult<any> {
        const iterator : this[ 'iterator' ] = this.iterator = this.calculation.call(this.calculationContext || this, ...args)

        return this.iterationResult = iterator.next()
    }


    supplyYieldValue (value : this[ 'YieldT' ]) : IteratorResult<any> {
        return this.iterationResult = this.iterator.next(value)
    }


    * calculation (...args : this[ 'ArgsT' ]) : this[ 'iterator' ] {
        throw new Error("Abstract method `calculation` called")
    }


    runSync (...args : this[ 'ArgsT' ]) : this[ 'ValueT' ] {
        return this.runSyncWithEffect(x => x)
    }


    runSyncWithEffect (onEffect : (effect : this[ 'YieldT' ]) => any, ...args : this[ 'ArgsT' ]) : this[ 'ValueT' ] {
        this.startCalculation(...args)

        while (!this.isCalculationCompleted()) {
            this.supplyYieldValue(onEffect(this.iterationResult.value))
        }

        return this.value
    }


    async runAsyncWithEffect (onEffect : (effect : this[ 'YieldT' ]) => Promise<any>, ...args : this[ 'ArgsT' ]) : Promise<this[ 'ValueT' ]> {
        this.startCalculation(...args)

        while (!this.isCalculationCompleted()) {
            this.supplyYieldValue(await onEffect(this.iterationResult.value))
        }

        return this.value
    }
}

export type Calculation = Mixin<typeof Calculation>
