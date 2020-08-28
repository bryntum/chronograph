import { Base } from "../class/Base.js"
import { prototypeValue } from "../util/Helpers.js"
import { Atom } from "./atom/Atom.js"
import { CalculationMode, CalculationModeGen, CalculationModeSync } from "./CalculationMode.js"

//---------------------------------------------------------------------------------------------------------------------
/**
 * This is a calculation context type. It is represented with a function, that receives some value (effect) and returns the result
 * (effect processing results). Can be also thought as "effect handler".
 *
 * When using generators-based calculation, there's no need to use this function directly - the syntax construct `yield` plays its role.
 */
export type EffectHandler<Mode extends CalculationMode> =
    Mode extends CalculationModeSync ?
        (effect : unknown) => any
        :
        Mode extends CalculationModeGen ?
            (effect : unknown) => any
            :
            // Mode extends CalculationModeAsync ?
            //     (effect : unknown) => Promise<any>
            //     :
                never


//---------------------------------------------------------------------------------------------------------------------
export async function runGeneratorAsyncWithEffect<ResultT, YieldT, ArgsT extends any[]> (
    onEffect    : EffectHandler<CalculationModeGen>,
    func        : (...args : ArgsT) => Generator<YieldT, ResultT, any>,
    args        : ArgsT,
    scope?      : any
) : Promise<ResultT>
{
    const gen       = func.apply(scope, args)

    let iteration   = gen.next()

    while (!iteration.done) {
        const effect    = onEffect(iteration.value)

        if (effect instanceof Promise)
            iteration   = gen.next(await effect)
        else
            iteration   = gen.next(effect)
    }

    return iteration.value
}


//---------------------------------------------------------------------------------------------------------------------
export function runGeneratorSyncWithEffect<ResultT, YieldT, ArgsT extends any[]> (
    onEffect    : EffectHandler<CalculationModeGen>,
    func        : (...args : ArgsT) => Generator<YieldT, ResultT, any>,
    args        : ArgsT,
    scope?      : any
) : Promise<ResultT>
{
    const gen       = func.apply(scope, args)

    let iteration   = gen.next()

    while (!iteration.done) {
        const effect    = iteration.value

        iteration       = gen.next(onEffect(effect))
    }

    return iteration.value
}


//---------------------------------------------------------------------------------------------------------------------
/**
 * The base class for effect. Effect is some value, that can be send to the "outer" calculation context, using the
 * effect handler function. Effect handler then will process an effect and return some resulting value.
 *
 * ```ts
 * const identifier  = graph.identifier((Y : SyncEffectHandler) : number => {
 *     const proposedValue : number    = Y(ProposedOrPrevious)
 *
 *     const maxValue : number         = Y(max)
 *
 *     return proposedValue <= maxValue ? proposedValue : maxValue
 * })
 * ```
 */
export class Effect extends Base {
    handler     : symbol    = undefined

    /**
     * Whether the effect is synchronous. Default value, defined in the prototype, is `true`.
     */
    @prototypeValue(true)
    sync        : boolean

    @prototypeValue(true)
    internal    : boolean
}


//---------------------------------------------------------------------------------------------------------------------
export const ProposedOrPreviousSymbol    = Symbol('ProposedOrPreviousSymbol')

/**
 * The constant that represents a request for either user input (proposed value) or previous value of the
 * identifier, currently being calculated.
 *
 * Important note, is that if an identifier yields a `ProposedOrPrevious` effect and its computed value does not match the value of this effect,
 * it will be re-calculated (computation function called) again on the next read. This is because the value of its `ProposedOrPrevious` input changes.
 *
 * ```ts
 * const graph4 = ChronoGraph.new()
 *
 * const max           = graph4.variable(100)
 *
 * const identifier15  = graph4.identifier((Y) : number => {
 *     const proposedValue : number    = Y(ProposedOrPrevious)
 *
 *     const maxValue : number         = Y(max)
 *
 *     return proposedValue <= maxValue ? proposedValue : maxValue
 * })
 *
 * graph4.write(identifier15, 18)
 *
 * const value15_1 = graph4.read(identifier15) // 18
 *
 * graph4.write(identifier15, 180)
 *
 * const value15_2 = graph4.read(identifier15) // 100
 *
 * graph4.write(max, 50)
 *
 * const value15_3 = graph4.read(identifier15) // 50
 * ```
 */
export const ProposedOrPrevious : Effect = Effect.new({ handler : ProposedOrPreviousSymbol })


//---------------------------------------------------------------------------------------------------------------------
export const RejectSymbol    = Symbol('RejectSymbol')

/**
 * Class for [[Reject]] effect.
 */
export class RejectEffect<Reason> extends Effect {
    handler         : symbol    = RejectSymbol

    /**
     * Reason of the reject
     */
    reason          : Reason
}

/**
 * This is constructor for `RejectEffect` class. If this effect will be yielded during computation the current transaction
 * will be [[ChronoGraph.reject|rejected]].
 *
 * @param reason
 * @constructor
 */
export const Reject = <Reason>(reason : Reason) : RejectEffect<Reason> => RejectEffect.new({ reason }) as RejectEffect<Reason>



//---------------------------------------------------------------------------------------------------------------------
export const PreviousValueOfSymbol    = Symbol('PreviousValueOfSymbol')

export class PreviousValueOfEffect extends Effect {
    handler         : symbol    = PreviousValueOfSymbol

    atom            : Atom
}

export const PreviousValueOf = (atom : Atom) : PreviousValueOfEffect => PreviousValueOfEffect.new({ atom })


//---------------------------------------------------------------------------------------------------------------------
export const ProposedValueOfSymbol    = Symbol('ProposedValueOfSymbol')

export class ProposedValueOfEffect extends Effect {
    handler         : symbol    = ProposedValueOfSymbol

    atom            : Atom
}

export const ProposedValueOf = (atom : Atom) : ProposedValueOfEffect => ProposedValueOfEffect.new({ atom })


//---------------------------------------------------------------------------------------------------------------------
export const HasProposedValueSymbol    = Symbol('HasProposedValueSymbol')

export class HasProposedValueEffect extends Effect {
    handler         : symbol    = HasProposedValueSymbol

    atom            : Atom
}

export const HasProposedValue = (atom : Atom) : HasProposedValueEffect => HasProposedValueEffect.new({ atom })


//---------------------------------------------------------------------------------------------------------------------
export const ProposedOrPreviousValueOfSymbol    = Symbol('ProposedOrPreviousValueOfSymbol')

export class ProposedOrPreviousValueOfEffect extends Effect {
    handler         : symbol    = ProposedOrPreviousValueOfSymbol

    atom            : Atom
}

export const ProposedOrPreviousValueOf = (atom : Atom) : ProposedOrPreviousValueOfEffect => ProposedOrPreviousValueOfEffect.new({ atom })


//---------------------------------------------------------------------------------------------------------------------
export const ProposedArgumentsOfSymbol    = Symbol('ProposedArgumentsOfSymbol')

export class ProposedArgumentsOfEffect extends Effect {
    handler         : symbol    = ProposedArgumentsOfSymbol

    atom            : Atom
}

export const ProposedArgumentsOf = (atom : Atom) : ProposedArgumentsOfEffect => ProposedArgumentsOfEffect.new({ atom })


// //---------------------------------------------------------------------------------------------------------------------
// export type ProgressNotificationEffect = {
//     total           : number
//
//     remaining       : number
//
//     phase           : string
// }
