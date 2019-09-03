import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { Box } from "./Box.js"


//---------------------------------------------------------------------------------------------------------------------
export type CalculationContext<YieldT> = (effect : YieldT) => any

//---------------------------------------------------------------------------------------------------------------------
export type CalculationFunction<ResultT, YieldT, ArgsT extends [ CalculationContext<YieldT>, ...any[] ]> =
    (...args : ArgsT) => unknown


//---------------------------------------------------------------------------------------------------------------------
export type CalculationIterator<ResultT, YieldT = any> = Generator<YieldT, ResultT, any>

export type CalculationGenFunction<ResultT, YieldT, ArgsT extends [ CalculationContext<YieldT>, ...any[] ]> =
    (...args : ArgsT) => CalculationIterator<ResultT, YieldT>

export type CalculationSyncFunction<ResultT, YieldT, ArgsT extends [ CalculationContext<YieldT>, ...any[] ]> =
    (...args : ArgsT) => ResultT


//---------------------------------------------------------------------------------------------------------------------
export interface GenericCalculation<ResultT, YieldT, ArgsT extends [ CalculationContext<YieldT>, ...any[] ]> extends Box<ResultT> {
    context                 : any

    calculation             : CalculationFunction<ResultT, YieldT, ArgsT>

    iterationResult         : IteratorResult<ResultT>

    isCalculationStarted ()     : boolean
    isCalculationCompleted ()   : boolean

    startCalculation (...args : ArgsT)      : IteratorResult<any>
    continueCalculation (value : unknown)   : IteratorResult<any>
}


//---------------------------------------------------------------------------------------------------------------------
export const CalculationGen = <
    T extends AnyConstructor<object>,
    ResultT = any,
    YieldT = any,
    ArgsT extends [ CalculationContext<YieldT>, ...any[] ] = [ CalculationContext<YieldT>, ...any[] ]
>(base : T) =>

class CalculationGen extends base implements GenericCalculation<ResultT, YieldT, ArgsT> {
    context             : any

    iterator            : CalculationIterator<ResultT, YieldT>

    iterationResult     : IteratorResult<any>


    isCalculationStarted () : boolean {
        return Boolean(this.iterator || this.iterationResult)
    }


    isCalculationCompleted () : boolean {
        return Boolean(this.iterationResult && this.iterationResult.done)
    }


    get value () : ResultT {
        return this.iterationResult && this.iterationResult.done ? this.iterationResult.value : undefined
    }


    hasValue () : boolean {
        return this.value !== undefined
    }


    startCalculation (onEffect : CalculationContext<YieldT>, ...args : any[]) : IteratorResult<any> {
        const iterator : this[ 'iterator' ] = this.iterator = this.calculation.call(this.context || this, onEffect, ...args)

        return this.iterationResult = iterator.next()
    }


    continueCalculation (value : unknown) : IteratorResult<any> {
        return this.iterationResult = this.iterator.next(value)
    }


    * calculation (onEffect : CalculationContext<YieldT>, ...args : any[]) : this[ 'iterator' ] {
        throw new Error("Abstract method `calculation` called")
    }


    runSyncWithEffect (onEffect : CalculationContext<YieldT>, ...args : any[]) : ResultT {
        this.startCalculation(onEffect, ...args)

        while (!this.isCalculationCompleted()) {
            this.continueCalculation(onEffect(this.iterationResult.value))
        }

        // help to garbage collector
        this.iterator               = undefined

        return this.value
    }


    async runAsyncWithEffect (onEffect : CalculationContext<YieldT>, ...args : any[]) : Promise<ResultT> {
        this.startCalculation(onEffect, ...args)

        while (!this.isCalculationCompleted()) {
            this.continueCalculation(await onEffect(this.iterationResult.value))
        }

        // help to garbage collector
        this.iterator               = undefined

        return this.value
    }
}

export type CalculationGen = Mixin<typeof CalculationGen>


export class MinimalCalculationGen extends CalculationGen(Base) {}


//---------------------------------------------------------------------------------------------------------------------
export const CalculationSync = <
    T extends AnyConstructor<object>,
    ResultT = any,
    YieldT = any,
    ArgsT extends [ CalculationContext<YieldT>, ...any[] ] = [ CalculationContext<YieldT>, ...any[] ]
>(base : T) =>

class CalculationGen extends base implements GenericCalculation<ResultT, YieldT, ArgsT> {
    context             : any

    iterationResult     : IteratorResult<any>


    isCalculationStarted () : boolean {
        return Boolean(this.iterationResult)
    }


    isCalculationCompleted () : boolean {
        return Boolean(this.iterationResult && this.iterationResult.done)
    }


    get value () : ResultT {
        return this.iterationResult && this.iterationResult.done ? this.iterationResult.value : undefined
    }


    hasValue () : boolean {
        return this.value !== undefined
    }


    startCalculation (onEffect : CalculationContext<YieldT>, ...args : any[]) : IteratorResult<any> {
        return this.iterationResult = {
            done    : true,
            value   : this.calculation.call(this.context || this, onEffect, ...args)
        }
    }


    continueCalculation (value : unknown) : IteratorResult<any> {
        throw new Error("Can not continue synchronous calculation")
    }


    calculation (onEffect : CalculationContext<YieldT>, ...args : any[]) : any {
        throw new Error("Abstract method `calculation` called")
    }


    runSyncWithEffect (onEffect : CalculationContext<YieldT>, ...args : any[]) : ResultT {
        this.startCalculation(onEffect, ...args)

        return this.value
    }


    async runAsyncWithEffect (onEffect : CalculationContext<YieldT>, ...args : any[]) : Promise<ResultT> {
        throw new Error('Can not run synchronous calculation asynchronously')
    }
}

export type CalculationSync = Mixin<typeof CalculationSync>


export class MinimalCalculationSync extends CalculationSync(Base) {}


//---------------------------------------------------------------------------------------------------------------------
export function runGeneratorSyncWithEffect<ResultT, YieldT, ArgsT extends [ CalculationContext<YieldT>, ...any[] ]> (
    func        : CalculationGenFunction<ResultT, YieldT, ArgsT>,
    args        : ArgsT,
    scope?      : any
) : ResultT
{
    const calculation       = MinimalCalculationGen.new({
        calculation         : func,
        context             : scope
    })

    return calculation.runSyncWithEffect(...args as [ CalculationContext<YieldT>, ...any[] ])
}


//---------------------------------------------------------------------------------------------------------------------
export async function runGeneratorAsyncWithEffect<ResultT, YieldT, ArgsT extends [ CalculationContext<YieldT>, ...any[] ]> (
    func        : CalculationGenFunction<ResultT, YieldT, ArgsT>,
    args        : ArgsT,
    scope?      : any
) : Promise<ResultT>
{
    const calculation       = MinimalCalculationGen.new({
        calculation         : func,
        context             : scope
    })

    return await calculation.runAsyncWithEffect(...args as [ CalculationContext<YieldT>, ...any[] ])
}
