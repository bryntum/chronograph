import { Base } from "../class/Base.js"
import { prototypeValue } from "../util/Helpers.js"
import { Identifier } from "./Identifier.js"

//---------------------------------------------------------------------------------------------------------------------
export const BreakCurrentStackExecution    = Symbol('BreakCurrentStackExecution')


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
    handler     : symbol

    /**
     * Whether the effect is synchronous. Default value, defined in the prototype, is `true`.
     */
    @prototypeValue(true)
    sync        : boolean

    @prototypeValue(true)
    pure        : boolean
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

    @prototypeValue(false)
    pure            : boolean
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
export const TransactionSymbol    = Symbol('TransactionSymbol')

export const GetTransaction : Effect = Effect.new({ handler : TransactionSymbol })


//---------------------------------------------------------------------------------------------------------------------
export const OwnQuarkSymbol    = Symbol('OwnQuarkSymbol')

export const OwnQuark : Effect = Effect.new({ handler : OwnQuarkSymbol })


//---------------------------------------------------------------------------------------------------------------------
export const OwnIdentifierSymbol    = Symbol('OwnIdentifierSymbol')

export const OwnIdentifier : Effect = Effect.new({ handler : OwnIdentifierSymbol })


//---------------------------------------------------------------------------------------------------------------------
export const WriteSymbol    = Symbol('WriteSymbol')

//---------------------------------------------------------------------------------------------------------------------
export type WriteInfo = {
    identifier      : Identifier
    proposedArgs    : [ any, ...any[] ]
}


export class WriteEffect extends Effect implements WriteInfo {
    handler                 : symbol    = WriteSymbol

    identifier              : Identifier
    proposedArgs            : [ any, ...any[] ]

    @prototypeValue(false)
    pure                    : boolean
}


export const Write = (identifier : Identifier, proposedValue : any, ...proposedArgs : any[]) : WriteEffect =>
    WriteEffect.new({ identifier, proposedArgs : [ proposedValue, ...proposedArgs ] })


export const WriteSeveralSymbol    = Symbol('WriteSeveralSymbol')

export class WriteSeveralEffect extends Effect {
    handler                 : symbol    = WriteSeveralSymbol

    writes                  : WriteInfo[]

    @prototypeValue(false)
    pure                    : boolean
}

export const WriteSeveral = (writes : WriteInfo[]) : WriteSeveralEffect => WriteSeveralEffect.new({ writes })


//---------------------------------------------------------------------------------------------------------------------
export const PreviousValueOfSymbol    = Symbol('PreviousValueOfSymbol')

export class PreviousValueOfEffect extends Effect {
    handler         : symbol    = PreviousValueOfSymbol

    identifier      : Identifier
}

export const PreviousValueOf = (identifier : Identifier) : PreviousValueOfEffect => PreviousValueOfEffect.new({ identifier })


//---------------------------------------------------------------------------------------------------------------------
export const ProposedValueOfSymbol    = Symbol('ProposedValueOfSymbol')

export class ProposedValueOfEffect extends Effect {
    handler         : symbol    = ProposedValueOfSymbol

    identifier      : Identifier
}

export const ProposedValueOf = (identifier : Identifier) : ProposedValueOfEffect => ProposedValueOfEffect.new({ identifier })


//---------------------------------------------------------------------------------------------------------------------
export const HasProposedValueSymbol    = Symbol('HasProposedValueSymbol')

export class HasProposedValueEffect extends Effect {
    handler         : symbol    = HasProposedValueSymbol

    identifier      : Identifier
}

export const HasProposedValue = (identifier : Identifier) : HasProposedValueEffect => HasProposedValueEffect.new({ identifier })


//---------------------------------------------------------------------------------------------------------------------
export const ProposedOrPreviousValueOfSymbol    = Symbol('ProposedOrPreviousValueOfSymbol')

export class ProposedOrPreviousValueOfEffect extends Effect {
    handler         : symbol    = ProposedOrPreviousValueOfSymbol

    identifier      : Identifier
}

export const ProposedOrPreviousValueOf = (identifier : Identifier) : ProposedOrPreviousValueOfEffect => ProposedOrPreviousValueOfEffect.new({ identifier })


//---------------------------------------------------------------------------------------------------------------------
export const ProposedArgumentsOfSymbol    = Symbol('ProposedArgumentsOfSymbol')

export class ProposedArgumentsOfEffect extends Effect {
    handler         : symbol    = ProposedArgumentsOfSymbol

    identifier      : Identifier
}

export const ProposedArgumentsOf = (identifier : Identifier) : ProposedArgumentsOfEffect => ProposedArgumentsOfEffect.new({ identifier })


//---------------------------------------------------------------------------------------------------------------------
export const UnsafeProposedOrPreviousValueOfSymbol    = Symbol('UnsafeProposedOrPreviousValueOfSymbol')

export class UnsafeProposedOrPreviousValueOfEffect extends Effect {
    handler         : symbol    = UnsafeProposedOrPreviousValueOfSymbol

    identifier      : Identifier
}

export const UnsafeProposedOrPreviousValueOf = (identifier : Identifier) : UnsafeProposedOrPreviousValueOfEffect => UnsafeProposedOrPreviousValueOfEffect.new({ identifier })


//---------------------------------------------------------------------------------------------------------------------
export const UnsafePreviousValueOfSymbol    = Symbol('UnsafePreviousValueOfSymbol')

export class UnsafePreviousValueOfEffect extends Effect {
    handler         : symbol    = UnsafePreviousValueOfSymbol

    identifier      : Identifier
}

export const UnsafePreviousValueOf = (identifier : Identifier) : UnsafePreviousValueOfEffect => UnsafePreviousValueOfEffect.new({ identifier })


//---------------------------------------------------------------------------------------------------------------------
export type ProgressNotificationEffect = {
    total           : number

    remaining       : number

    phase           : string
}
