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
export type CalculationIterator<ResultT, YieldT = any> = Generator<YieldT, ResultT, any>


/**
 * Calculation mode "picker".
 *
 * This type allows generic typization of the identifiers's calculation function (a single type for all calculation modes).
 */
export type CalculationReturnValue<Ctx extends CalculationModeUnknown, ResultT, YieldT> =
    Ctx extends typeof CalculationModeSync ?
        ResultT
        :
        Ctx extends typeof CalculationModeGen ?
            CalculationIterator<ResultT, YieldT>
            :
            Promise<ResultT>
