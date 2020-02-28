import { Base } from "../class/BetterMixin.js"
import { prototypeValue } from "../util/Helpers.js"
import { Identifier } from "./Identifier.js"

//---------------------------------------------------------------------------------------------------------------------
export const BreakCurrentStackExecution    = Symbol('BreakCurrentStackExecution')


//---------------------------------------------------------------------------------------------------------------------
/**
 * The base class for effect.
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
export const ProposedOrCurrentSymbol    = Symbol('ProposedOrCurrentSymbol')

export const ProposedOrCurrent : Effect = Effect.new({ handler : ProposedOrCurrentSymbol })


//---------------------------------------------------------------------------------------------------------------------
export const RejectSymbol    = Symbol('RejectSymbol')

export class RejectEffect<Reason> extends Effect {
    handler         : symbol    = RejectSymbol

    reason          : Reason

    @prototypeValue(false)
    pure            : boolean
}

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
