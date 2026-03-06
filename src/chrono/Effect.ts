import { Base } from "../class/Base.js"
import { prototypeValue } from "../util/Helpers.js"
import { Identifier } from "./Identifier.js"

//---------------------------------------------------------------------------------------------------------------------
/**
 * A sentinel symbol yielded to break the current synchronous stack execution and defer to the next microtask.
 * Used internally to avoid stack overflow during deep synchronous computation chains.
 */
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
    /** Symbol identifying which effect handler should process this effect */
    handler     : symbol

    /**
     * Whether the effect is synchronous. Default value, defined in the prototype, is `true`.
     */
    @prototypeValue(true)
    sync        : boolean

    /**
     * Whether the effect is pure (has no side effects on graph state). Default is `true`.
     * Impure effects (like [[WriteEffect]], [[RejectEffect]]) modify the graph and are set to `false`.
     */
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

/**
 * An effect that, when yielded from a calculation function, returns the current [[Transaction]] instance.
 * Useful for advanced calculations that need to inspect or interact with the transaction directly.
 */
export const GetTransaction : Effect = Effect.new({ handler : TransactionSymbol })


//---------------------------------------------------------------------------------------------------------------------
export const OwnQuarkSymbol    = Symbol('OwnQuarkSymbol')

/**
 * An effect that, when yielded from a calculation function, returns the [[Quark]] of the identifier
 * currently being calculated.
 */
export const OwnQuark : Effect = Effect.new({ handler : OwnQuarkSymbol })


//---------------------------------------------------------------------------------------------------------------------
export const OwnIdentifierSymbol    = Symbol('OwnIdentifierSymbol')

/**
 * An effect that, when yielded from a calculation function, returns the [[Identifier]] that is
 * currently being calculated.
 */
export const OwnIdentifier : Effect = Effect.new({ handler : OwnIdentifierSymbol })


//---------------------------------------------------------------------------------------------------------------------
export const WriteSymbol    = Symbol('WriteSymbol')

//---------------------------------------------------------------------------------------------------------------------
/**
 * Describes a single write operation: the target identifier and the proposed arguments.
 */
export type WriteInfo = {
    /** The identifier to write to */
    identifier      : Identifier
    /** The proposed value and any additional arguments */
    proposedArgs    : [ any, ...any[] ]
}


/**
 * Effect class for a single [[Write]] operation. Writing to another identifier from within a calculation
 * function allows one identifier to push values to others.
 */
export class WriteEffect extends Effect implements WriteInfo {
    handler                 : symbol    = WriteSymbol

    identifier              : Identifier
    proposedArgs            : [ any, ...any[] ]

    @prototypeValue(false)
    pure                    : boolean
}


/**
 * Constructor for [[WriteEffect]]. Yields a write to another identifier from within a calculation function.
 *
 * @param identifier The identifier to write to
 * @param proposedValue The value to propose
 * @param proposedArgs Additional arguments
 */
export const Write = (identifier : Identifier, proposedValue : any, ...proposedArgs : any[]) : WriteEffect =>
    WriteEffect.new({ identifier, proposedArgs : [ proposedValue, ...proposedArgs ] })


export const WriteSeveralSymbol    = Symbol('WriteSeveralSymbol')

/**
 * Effect class for writing to multiple identifiers atomically in a single yield.
 * More efficient than yielding multiple individual [[Write]] effects.
 */
export class WriteSeveralEffect extends Effect {
    handler                 : symbol    = WriteSeveralSymbol

    /** Array of write operations to perform */
    writes                  : WriteInfo[]

    @prototypeValue(false)
    pure                    : boolean
}

/**
 * Constructor for [[WriteSeveralEffect]]. Writes to multiple identifiers in a single yield.
 *
 * @param writes Array of [[WriteInfo]] objects describing each write
 */
export const WriteSeveral = (writes : WriteInfo[]) : WriteSeveralEffect => WriteSeveralEffect.new({ writes })

//---------------------------------------------------------------------------------------------------------------------
export const HasPreviousValueSymbol    = Symbol('HasPreviousValueSymbol')

/**
 * Effect class for checking whether a given identifier had a value in the previous revision.
 * Creates a past edge to the target identifier.
 */
export class HasPreviousValueEffect extends Effect {
    handler         : symbol    = HasPreviousValueSymbol

    /** The identifier to check for a previous value */
    identifier      : Identifier
}

/**
 * Constructor for [[HasPreviousValueEffect]]. Returns `true` if the identifier had a computed value
 * in the previous revision.
 *
 * @param identifier The identifier to check
 */
export const HasPreviousValue = (identifier : Identifier) : HasPreviousValueEffect => HasPreviousValueEffect.new({ identifier })


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
export const HasProposedNotPreviousValueSymbol    = Symbol('HasProposedNotPreviousValueSymbol')

export class HasProposedNotPreviousValueEffect extends Effect {
    handler         : symbol    = HasProposedNotPreviousValueSymbol

    identifier      : Identifier
}

export const HasProposedNotPreviousValue = (identifier : Identifier) : HasProposedNotPreviousValueEffect => HasProposedNotPreviousValueEffect.new({ identifier })


//---------------------------------------------------------------------------------------------------------------------
export const ProposedOrPreviousValueOfSymbol    = Symbol('ProposedOrPreviousValueOfSymbol')

export class ProposedOrPreviousValueOfEffect extends Effect {
    handler         : symbol    = ProposedOrPreviousValueOfSymbol

    identifier      : Identifier
}

export const ProposedOrPreviousValueOf = (identifier : Identifier) : ProposedOrPreviousValueOfEffect => ProposedOrPreviousValueOfEffect.new({ identifier })


//---------------------------------------------------------------------------------------------------------------------
export const ProposedArgumentsOfSymbol    = Symbol('ProposedArgumentsOfSymbol')

/**
 * Effect class for retrieving the proposed arguments (additional arguments passed alongside
 * the proposed value via [[Write]]) for a given identifier.
 */
export class ProposedArgumentsOfEffect extends Effect {
    handler         : symbol    = ProposedArgumentsOfSymbol

    /** The identifier to retrieve proposed arguments for */
    identifier      : Identifier
}

/**
 * Constructor for [[ProposedArgumentsOfEffect]]. Returns the proposed arguments array for the given identifier.
 *
 * @param identifier The identifier to query
 */
export const ProposedArgumentsOf = (identifier : Identifier) : ProposedArgumentsOfEffect => ProposedArgumentsOfEffect.new({ identifier })


//---------------------------------------------------------------------------------------------------------------------
export const UnsafeProposedOrPreviousValueOfSymbol    = Symbol('UnsafeProposedOrPreviousValueOfSymbol')

/**
 * Effect class for reading the proposed-or-previous value of another identifier without creating
 * a dependency edge. "Unsafe" because changes to the target will not trigger recalculation of the reader.
 */
export class UnsafeProposedOrPreviousValueOfEffect extends Effect {
    handler         : symbol    = UnsafeProposedOrPreviousValueOfSymbol

    /** The identifier to read from without creating a dependency */
    identifier      : Identifier
}

/**
 * Constructor for [[UnsafeProposedOrPreviousValueOfEffect]]. Reads the proposed-or-previous value
 * of another identifier without establishing a dependency edge.
 *
 * @param identifier The identifier to read from
 */
export const UnsafeProposedOrPreviousValueOf = (identifier : Identifier) : UnsafeProposedOrPreviousValueOfEffect => UnsafeProposedOrPreviousValueOfEffect.new({ identifier })


//---------------------------------------------------------------------------------------------------------------------
export const UnsafePreviousValueOfSymbol    = Symbol('UnsafePreviousValueOfSymbol')

/**
 * Effect class for reading the previous value of another identifier without creating a dependency edge.
 * "Unsafe" because changes to the target will not trigger recalculation of the reader.
 */
export class UnsafePreviousValueOfEffect extends Effect {
    handler         : symbol    = UnsafePreviousValueOfSymbol

    /** The identifier to read the previous value from without creating a dependency */
    identifier      : Identifier
}

/**
 * Constructor for [[UnsafePreviousValueOfEffect]]. Reads the previous revision's value
 * of another identifier without establishing a dependency edge.
 *
 * @param identifier The identifier to read from
 */
export const UnsafePreviousValueOf = (identifier : Identifier) : UnsafePreviousValueOfEffect => UnsafePreviousValueOfEffect.new({ identifier })


//---------------------------------------------------------------------------------------------------------------------
/**
 * Type for a progress notification yielded during long-running calculations (e.g., scheduling engine propagation).
 * Allows the UI to display progress feedback.
 */
export type ProgressNotificationEffect = {
    /** Total number of work items */
    total           : number

    /** Number of work items remaining */
    remaining       : number

    /** Description of the current computation phase */
    phase           : string
}
