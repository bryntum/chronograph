import { AnyConstructor, AnyFunction, Base, Mixin } from "../class/Mixin.js"
import { ChronoAtom, isChronoAtom } from "./Atom.js"
import { Box } from "./Box.js"
import { Effect, isEffect } from "./Effect.js"


//---------------------------------------------------------------------------------------------------------------------
export type ChronoValue = any


//---------------------------------------------------------------------------------------------------------------------
export type ChronoIterator<T = ChronoValue> = IterableIterator<ChronoAtom | Effect | T>


//---------------------------------------------------------------------------------------------------------------------
export type ChronoCalculationFunc<T = ChronoValue> = (...args : any[]) => ChronoIterator<T>


//---------------------------------------------------------------------------------------------------------------------
export type ChronoIterationResult = { value? : ChronoValue, requested? : ChronoAtom, effect? : Effect }


//---------------------------------------------------------------------------------------------------------------------
const isChronoCalculationSymbol = Symbol('isChronoCalculationSymbol')


//---------------------------------------------------------------------------------------------------------------------
export const ChronoCalculation = <T extends AnyConstructor<Box>>(base : T) =>

class ChronoCalculation extends base {
    [isChronoCalculationSymbol] () {}

    calculation         : ChronoCalculationFunc<this[ 'valueT' ]>
    calculationContext  : any

    iterator            : IterableIterator<this[ 'valueT' ]>

    requested           : ChronoAtom


    isCalculationStarted () : boolean {
        return Boolean(this.iterator)
    }


    isCalculationCompleted () : boolean {
        return this.hasOwnProperty('value')
    }


    startCalculation (...args : any[]) : ChronoIterationResult {
        if (this.isCalculationStarted()) throw new Error("Calculation already started")

        const iterator : this[ 'iterator' ] = this.iterator = this.calculation.call(this.calculationContext, ...args)

        const iterationResult   = iterator.next()

        return this.continueCalculation(iterationResult)
    }


    continueCalculation (iterationResult : IteratorResult<this[ 'valueT' ]>) : ChronoIterationResult {
        if (!this.isCalculationStarted()) throw new Error("Calculation not started")

        const value = iterationResult.value

        if (iterationResult.done) {
            this.value      = value

            return { value }
        } else {
            if (isChronoAtom(value)) {
                this.requested  = value

                return { requested : value }

            } else if (isEffect(value)) {

                return { effect : value }

            } else
                throw new Error("Invalid yield")
        }
    }


    supplyRequestedValue (value : ChronoValue) : ChronoIterationResult {
        this.requested      = null

        return this.continueCalculation(this.iterator.next(value))
    }
}

export type ChronoCalculation = Mixin<typeof ChronoCalculation>
export interface ChronoCalculationI extends Mixin<typeof ChronoCalculation> {}

export class MinimalChronoCalculation extends ChronoCalculation(Box(Base)) {}

export const isChronoCalculation = (value : any) : value is ChronoCalculation => Boolean(value && value[ isChronoCalculationSymbol ])

// //---------------------------------------------------------------------------------------------------------------------
// export class CalculationContext<OnEffectReturnType = any> extends Base {
//     onEffect                : (effect : Effect) => OnEffectReturnType
//
//     // onValue                 : (value : Value) => OnEffectReturnType
// }
//
//
// // export type SynchronousRun<Value> = (calculation : ChronoCalculation, context : CalculationContext<Value, void>) => Value
// //
// // export function runSyncInContext<Value> (calculation : ChronoCalculation, context : CalculationContext<Value, void>) : Value {
// //
// //     do {
// //         const iterationResult       = calculation.startCalculation()
// //     } while (true)
// // }
//
//

// export type GeneratorFunc<A> = (...args : any[]) => IterableIterator<A>
//
//
// export const runGeneratorSync = <V>(genFunc : GeneratorFunc<V>, ...args : any[]) : V => {
//     const iterator      = genFunc(...args)
//
//     let iteratorValue : IteratorResult<any>
//
//     do {
//         iteratorValue   = iterator.next()
//     } while (!iteratorValue.done)
//
//     return iteratorValue.value
// }
//
//
//
// export const runGeneratorWithEffect = function* <V>(onEffect : GeneratorFunc<any>, genFunc : GeneratorFunc<V>, ...args : any[]) : IterableIterator<V> {
//     const iterator      = genFunc(...args)
//
//     let iteratorValue : IteratorResult<V>
//
//     let nextArgs : any  = undefined
//
//     do {
//         iteratorValue   = iterator.next(nextArgs)
//
//         const value     = iteratorValue.value
//
//         if (iteratorValue.done) return value
//
//         nextArgs        = yield* onEffect(value)
//
//     } while (true)
// }
