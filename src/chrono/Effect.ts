import { Base } from "../class/Mixin.js"
import { Identifier } from "./Identifier.js"


//---------------------------------------------------------------------------------------------------------------------
export class Effect extends Base {
    handler     : symbol

    // @prototypeValue(false)
    // async       : boolean

    // @prototypeValue(false)
    // impure      : boolean
}


//---------------------------------------------------------------------------------------------------------------------
export const ProposedOrCurrentSymbol    = Symbol('ProposedOrCurrentSymbol')

export const ProposedOrCurrent : Effect = Effect.new({ handler : ProposedOrCurrentSymbol })


//---------------------------------------------------------------------------------------------------------------------
// export const CancelPropagationSymbol    = Symbol('CancelPropagationSymbol')
//
// export const CancelPropagation : Effect = Effect.new({ handler : CancelPropagationSymbol })

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

export class WriteEffect extends Effect {
    handler         : symbol    = WriteSymbol

    writeTarget     : Identifier
    proposedArgs    : [ any, ...any[] ]
}


export const Write = (writeTarget : Identifier, proposedValue : any, ...proposedArgs : any[]) : WriteEffect =>
    WriteEffect.new({ writeTarget, proposedArgs : [ proposedValue, ...proposedArgs ] })


//---------------------------------------------------------------------------------------------------------------------
export type WriteInfo = {
    identifier      : Identifier
    proposedArgs    : [ any, ...any[] ]
}

export const WriteSeveralSymbol    = Symbol('WriteSeveralSymbol')

export class WriteSeveralEffect extends Effect {
    handler                 : symbol    = WriteSeveralSymbol

    writes                  : WriteInfo[]
}


export const WriteSeveral = (writes : WriteInfo[]) : WriteSeveralEffect => WriteSeveralEffect.new({ writes })


