import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { Box } from "./Box.js"


//---------------------------------------------------------------------------------------------------------------------
export type CalculationIterator<ResultT = any, YieldT = any> = Generator<YieldT, ResultT, any>


//---------------------------------------------------------------------------------------------------------------------
export type CalculationGenFunction<ResultT = any, YieldT = any, ArgsT extends any[] = any[]> = (...args : ArgsT) => CalculationIterator<ResultT, YieldT>


//---------------------------------------------------------------------------------------------------------------------
export const CalculationGen = <T extends AnyConstructor<Box>>(base : T) =>

class CalculationGen extends base {
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


    startCalculation (...args : this[ 'ArgsT' ]) : IteratorResult<any> {
        const iterator : this[ 'iterator' ] = this.iterator = this.calculation.call(this.calculationContext || this, ...args)

        return this.iterationResult = iterator.next()
    }


    continueCalculation (value : this[ 'YieldT' ]) : IteratorResult<any> {
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
            this.continueCalculation(onEffect(this.iterationResult.value))
        }

        // help to garbage collector
        this.iterator               = undefined

        return this.value
    }


    async runAsyncWithEffect (onEffect : (effect : this[ 'YieldT' ]) => Promise<any>, ...args : this[ 'ArgsT' ]) : Promise<this[ 'ValueT' ]> {
        this.startCalculation(...args)

        while (!this.isCalculationCompleted()) {
            this.continueCalculation(await onEffect(this.iterationResult.value))
        }

        // help to garbage collector
        this.iterator               = undefined

        return this.value
    }
}

export type CalculationGen = Mixin<typeof CalculationGen>


export class MinimalCalculationGen extends CalculationGen(Box(Base)) {}


//---------------------------------------------------------------------------------------------------------------------
export const CalculationSync = <T extends AnyConstructor<Box>>(base : T) =>

class CalculationSync extends base {
    ArgsT               : any[]
    YieldT              : any

    calculationContext  : any

    iterationResult     : IteratorResult<any>


    isCalculationStarted () : boolean {
        return Boolean(this.iterationResult)
    }


    isCalculationCompleted () : boolean {
        return Boolean(this.iterationResult && this.iterationResult.done)
    }


    get value () : this[ 'ValueT' ] {
        return this.iterationResult && this.iterationResult.done ? this.iterationResult.value : undefined
    }


    startCalculation (...args : this[ 'ArgsT' ]) : IteratorResult<any> {
        return this.iterationResult = { done : true, value : this.calculation.call(this.calculationContext || this, ...args) }
    }


    continueCalculation (value : this[ 'YieldT' ]) : IteratorResult<any> {
        throw new Error("Can not continue synchronous calculation")
    }


    calculation (...args : this[ 'ArgsT' ]) : any {
        throw new Error("Abstract method `calculation` called")
    }


    // runSync (...args : this[ 'ArgsT' ]) : this[ 'ValueT' ] {
    //     return this.runSyncWithEffect(x => x)
    // }
    //
    //
    // runSyncWithEffect (onEffect : (effect : this[ 'YieldT' ]) => any, ...args : this[ 'ArgsT' ]) : this[ 'ValueT' ] {
    //     this.startCalculation(...args)
    //
    //     while (!this.isCalculationCompleted()) {
    //         this.continueCalculation(onEffect(this.iterationResult.value))
    //     }
    //
    //     // help to garbage collector
    //     this.iterator               = undefined
    //
    //     return this.value
    // }
    //
    //
    // async runAsyncWithEffect (onEffect : (effect : this[ 'YieldT' ]) => Promise<any>, ...args : this[ 'ArgsT' ]) : Promise<this[ 'ValueT' ]> {
    //     this.startCalculation(...args)
    //
    //     while (!this.isCalculationCompleted()) {
    //         this.continueCalculation(await onEffect(this.iterationResult.value))
    //     }
    //
    //     // help to garbage collector
    //     this.iterator               = undefined
    //
    //     return this.value
    // }
}

export type CalculationSync = Mixin<typeof CalculationSync>


export class MinimalCalculationSync extends CalculationSync(Box(Base)) {}


//---------------------------------------------------------------------------------------------------------------------
export function runSyncWithEffect<ArgsT extends any[], YieldT, ResultT> (
    onEffect    : (effect : YieldT) => any,
    func        : CalculationGenFunction<ResultT, YieldT, ArgsT>,
    args        : ArgsT,
    scope?      : any
) : ResultT
{
    const calculation       = MinimalCalculationGen.new({
        calculation         : func,
        calculationContext  : scope
    })

    return calculation.runSyncWithEffect(onEffect, ...args)
}


//---------------------------------------------------------------------------------------------------------------------
export async function runAsyncWithEffect<ArgsT extends any[], YieldT, ResultT> (
    onEffect    : (effect : YieldT) => Promise<any>,
    func        : CalculationGenFunction<ResultT, YieldT, ArgsT>,
    args        : ArgsT,
    scope?      : any
) : Promise<ResultT>
{
    const calculation       = MinimalCalculationGen.new({
        calculation         : func,
        calculationContext  : scope
    })

    return await calculation.runAsyncWithEffect(onEffect, ...args)
}
