import { AnyConstructor, AnyFunction, Mixin } from "../class/Mixin.js"


//---------------------------------------------------------------------------------------------------------------------
export interface GenericCalculation {
    // this is just a scope for the `calculation` function, not related to `CalculationContext` type
    context                     : unknown

    calculation                 : AnyFunction

    isCalculationStarted ()     : boolean
    isCalculationCompleted ()   : boolean

    startCalculation (...args : unknown[]) : IteratorResult<unknown>
    continueCalculation (value : unknown) : IteratorResult<unknown>

    cleanupCalculation ()

    readonly result             : unknown
}


//---------------------------------------------------------------------------------------------------------------------
export class CalculationGen extends Mixin(
    [],
    (base : AnyConstructor) =>

    class CalculationGen extends base implements GenericCalculation {
        context             : unknown

        calculation         : AnyFunction

        iterator            : Generator<unknown, unknown>       = undefined

        iterationResult     : IteratorResult<unknown>           = undefined


        isCalculationStarted () : boolean {
            return Boolean(this.iterator || this.iterationResult)
        }


        isCalculationCompleted () : boolean {
            return Boolean(this.iterationResult && this.iterationResult.done)
        }


        get result () : unknown {
            return this.iterationResult && this.iterationResult.done ? this.iterationResult.value : undefined
        }


        startCalculation (...args : unknown[]) : IteratorResult<unknown> {
            const iterator : this[ 'iterator' ] = this.iterator = this.calculation.call(this.context || this, ...args)

            return this.iterationResult = iterator.next()
        }


        continueCalculation (value : unknown) : IteratorResult<any> {
            // MAYBE: cleanup the `this.iterator` right away if `done`
            return this.iterationResult = this.iterator.next(value)
        }


        cleanupCalculation () {
            this.iterationResult        = undefined
            this.iterator               = undefined
        }
    }
){}


//---------------------------------------------------------------------------------------------------------------------
export const SyncCalculationStarted  = Symbol('SyncCalculationStarted')

const fixedIterationResult : IteratorResult<unknown> = {
    done        : true,
    value       : undefined
}

export class CalculationSync extends Mixin(
    [],
    (base : AnyConstructor) =>

    class CalculationSync extends base implements GenericCalculation {
        context             : unknown

        calculation         : AnyFunction

        calculationResult   : unknown       = undefined


        isCalculationStarted () : boolean {
            return this.calculationResult !== undefined
        }


        isCalculationCompleted () : boolean {
            return this.calculationResult !== undefined && this.calculationResult !== SyncCalculationStarted
        }


        get result () : unknown {
            return this.calculationResult !== undefined && this.calculationResult !== SyncCalculationStarted ? this.calculationResult : undefined
        }


        startCalculation (...args : unknown[]) : IteratorResult<unknown> {
            // this assignment allows other code to observe, that calculation has started
            this.calculationResult = SyncCalculationStarted

            this.calculationResult = fixedIterationResult.value = this.calculation.call(this.context || this, ...args)

            return fixedIterationResult
        }


        continueCalculation (value : unknown) : IteratorResult<unknown> {
            throw new Error("Can not continue synchronous calculation")
        }


        cleanupCalculation () {
            this.calculationResult        = undefined
        }
    }
){}



