import { AnyConstructor, Mixin } from "../class/Mixin.js"

//---------------------------------------------------------------------------------------------------------------------
/**
 * Type of return value of the generator function.
 */
export type CalculationIterator<ResultT, YieldT = any> = Generator<YieldT, ResultT, any>

//---------------------------------------------------------------------------------------------------------------------
/**
 * Symbol to denote the synchronous calculation context
 */
export const ContextSync    = Symbol('ContextSync')
/**
 * Symbol to denote the generator calculation context
 */
export const ContextGen     = Symbol('ContextGen')

/**
 * Type, denoting the generic calculation context (both sync and generators).
 */
export type Context         = typeof ContextSync | typeof ContextGen

/**
 * Type "picker". This is an object type, with 2 properties - [[ContextSync]] and [[ContextGen]]. Every property
 * "translate" the generic arguments of the type, to different types.
 *
 * This type allows generic typization of the identifiers's calculation function (a single type both
 * for the synchronous and generator-based functions).
 */
export type Contexts<ResultT, YieldT> = {
    [ContextGen]    : CalculationIterator<ResultT, YieldT>,
    [ContextSync]   : ResultT
}


//---------------------------------------------------------------------------------------------------------------------
/**
 * This is a calculation context type. It is represented with a function, that receives some value (effect) and returns the result
 * (effect processing results). Can be also thought as "effect handler".
 *
 * When using generators-based calculation, there's no need to use this function directly - the syntax construct `yield` plays its role.
 */
export type CalculationContext<YieldT> = (effect : YieldT) => any

export type CalculationFunction<ContextT extends Context, ResultT, YieldT, ArgsT extends [ CalculationContext<YieldT>, ...any[] ]> =
    (...args : ArgsT) => Contexts<ResultT, YieldT>[ ContextT ]


//---------------------------------------------------------------------------------------------------------------------
export interface GenericCalculation<ContextT extends Context, ResultT, YieldT, ArgsT extends [ CalculationContext<YieldT>, ...any[] ]> {
    // this is just a scope for the `calculation` function, not related to `CalculationContext` type
    context                     : any

    calculation                 : CalculationFunction<ContextT, ResultT, YieldT, ArgsT>

    iterationResult             : IteratorResult<ResultT>

    isCalculationStarted ()     : boolean
    isCalculationCompleted ()   : boolean

    startCalculation (...args : ArgsT)      : IteratorResult<any>
    continueCalculation (value : unknown)   : IteratorResult<any>

    cleanupCalculation ()

    readonly result             : ResultT
}


//---------------------------------------------------------------------------------------------------------------------
export class CalculationGen extends Mixin(
    [],
    <
        ResultT = any, YieldT = any, ArgsT extends [ CalculationContext<YieldT>, ...any[] ] = [ CalculationContext<YieldT>, ...any[] ]
    >(base : AnyConstructor) =>

class CalculationGen extends base implements GenericCalculation<typeof ContextGen, ResultT, YieldT, ArgsT> {
    context             : any

    iterator            : CalculationIterator<ResultT, YieldT>  = undefined

    iterationResult     : IteratorResult<any>                   = undefined


    isCalculationStarted () : boolean {
        return Boolean(this.iterator || this.iterationResult)
    }


    isCalculationCompleted () : boolean {
        return Boolean(this.iterationResult && this.iterationResult.done)
    }


    get result () : ResultT {
        return this.iterationResult && this.iterationResult.done ? this.iterationResult.value : undefined
    }


    startCalculation (onEffect : CalculationContext<YieldT>, ...args : any[]) : IteratorResult<any> {
        const iterator : this[ 'iterator' ] = this.iterator = this.calculation.call(this.context || this, onEffect, ...args)

        return this.iterationResult = iterator.next()
    }


    continueCalculation (value : unknown) : IteratorResult<any> {
        return this.iterationResult = this.iterator.next(value)
    }


    cleanupCalculation () {
        this.iterationResult        = undefined
        this.iterator               = undefined
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

        return this.result
    }


    async runAsyncWithEffect (onEffect : CalculationContext<YieldT>, ...args : any[]) : Promise<ResultT> {
        this.startCalculation(onEffect, ...args)

        while (!this.isCalculationCompleted()) {
            this.continueCalculation(await onEffect(this.iterationResult.value))
        }

        // help to garbage collector
        this.iterator               = undefined

        return this.result
    }
}){}


//---------------------------------------------------------------------------------------------------------------------
export const SynchronousCalculationStarted  = Symbol('SynchronousCalculationStarted')

const calculationStartedConstant : { value : typeof SynchronousCalculationStarted } = { value : SynchronousCalculationStarted }

export class CalculationSync extends Mixin(
    [],
    <
        ResultT = any,
        YieldT = any,
        ArgsT extends [ CalculationContext<YieldT>, ...any[] ] = [ CalculationContext<YieldT>, ...any[] ]
    >(base : AnyConstructor) =>

class CalculationSync extends base implements GenericCalculation<typeof ContextSync, ResultT, YieldT, ArgsT> {
    context             : any

    iterationResult     : IteratorResult<any>       = undefined


    isCalculationStarted () : boolean {
        return Boolean(this.iterationResult)
    }


    isCalculationCompleted () : boolean {
        return Boolean(this.iterationResult && this.iterationResult.done)
    }


    get result () : ResultT {
        return this.iterationResult && this.iterationResult.done ? this.iterationResult.value : undefined
    }


    startCalculation (onEffect : CalculationContext<YieldT>, ...args : any[]) : IteratorResult<any> {
        // this assignment allows other code to observe, that calculation has started
        this.iterationResult = calculationStartedConstant

        return this.iterationResult = {
            done    : true,
            value   : this.calculation.call(this.context || this, onEffect, ...args)
        }
    }


    continueCalculation (value : unknown) : IteratorResult<any> {
        throw new Error("Can not continue synchronous calculation")
    }


    cleanupCalculation () {
        this.iterationResult        = undefined
    }


    calculation (onEffect : CalculationContext<YieldT>, ...args : any[]) : ResultT {
        throw new Error("Abstract method `calculation` called")
    }


    runSyncWithEffect (onEffect : CalculationContext<YieldT>, ...args : any[]) : ResultT {
        this.startCalculation(onEffect, ...args)

        return this.result
    }


    async runAsyncWithEffect (onEffect : CalculationContext<YieldT>, ...args : any[]) : Promise<ResultT> {
        throw new Error('Can not run synchronous calculation asynchronously')
    }
}){}



//---------------------------------------------------------------------------------------------------------------------
export function runGeneratorSyncWithEffect<ResultT, YieldT, ArgsT extends any[]> (
    effect      : CalculationContext<YieldT>,
    func        : (...args : ArgsT) => Generator<YieldT, ResultT, any>,
    args        : ArgsT,
    scope?      : any
) : ResultT
{
    const gen       = func.apply(scope || null, args)

    let iteration   = gen.next()

    while (!iteration.done) {
        iteration   = gen.next(effect(iteration.value))
    }

    return iteration.value
}


//---------------------------------------------------------------------------------------------------------------------
export async function runGeneratorAsyncWithEffect<ResultT, YieldT, ArgsT extends any[]> (
    effect      : CalculationContext<YieldT>,
    func        : (...args : ArgsT) => Generator<YieldT, ResultT, any>,
    args        : ArgsT,
    scope?      : any
) : Promise<ResultT>
{
    const gen       = func.apply(scope || null, args)

    let iteration   = gen.next()

    while (!iteration.done) {
        const effectResolution  = effect(iteration.value)

        if (effectResolution instanceof Promise)
            iteration   = gen.next(await effectResolution)
        else
            iteration   = gen.next(effectResolution)
    }

    return iteration.value
}
