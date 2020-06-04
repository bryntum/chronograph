//---------------------------------------------------------------------------------------------------------------------
/**
 * Symbol to denote the synchronous calculation mode
 */
export const CalculationModeSync    = Symbol('ContextSync')

export type CalculationModeSync     = typeof CalculationModeSync

/**
 * Symbol to denote the asynchronous calculation mode
 */
export const CalculationModeAsync   = Symbol('CalculationModeAsync')

export type CalculationModeAsync    = typeof CalculationModeAsync

/**
 * Symbol to denote the generator calculation mode
 */
export const CalculationModeGen     = Symbol('CalculationModeGen')

export type CalculationModeGen      = typeof CalculationModeGen

/**
 * Type, denoting the unknown calculation mode
 */
export type CalculationModeUnknown  = CalculationModeSync | CalculationModeAsync | CalculationModeGen


//---------------------------------------------------------------------------------------------------------------------
/**
 * Type of return value of the calculation in generator calculation mode.
 */
export type CalculationIterator<Result> = Generator<any, Result, any>


/**
 * Calculation mode "picker".
 *
 * This type allows generic typization of the identifiers's calculation function (a single type for all calculation modes).
 */
export type CalculationReturnValue<Mode extends CalculationModeUnknown, Result> =
    Mode extends CalculationModeSync ?
        Result
        :
        Mode extends CalculationModeGen ?
            CalculationIterator<Result>
            :
            Mode extends CalculationModeAsync ?
                Promise<Result>
                :
                never
