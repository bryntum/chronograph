import { Base } from "../class/Base.js"
import { CalculationContext, CalculationGen, CalculationSync, Context, ContextGen, Contexts, ContextSync } from "../primitives/Calculation.js"
import { prototypeValue } from "../util/Helpers.js"
import { ProposedOrPrevious } from "./Effect.js"
import { ChronoGraph } from "./Graph.js"
import { Quark, QuarkConstructor } from "./Quark.js"
import { Revision } from "./Revision.js"
import { Transaction, YieldableValue } from "./Transaction.js"


//---------------------------------------------------------------------------------------------------------------------
/**

Levels of the [[Identifier|identifiers]] as simple integers. Defines the order of calculation, enforced by the following rule -
all lower level identifiers should be already calculated before the calculation of the identifier with the higher level starts.

Because of this, the lower level identifiers can not depend on higher level identifiers.

This rule means that effects from all identifiers of the lower levels will be already processed, when calculating
an identifier of the higher level.

Normally you don't need to specify a level for your identifiers.

*/
export enum Levels {
    // must be sync
    UserInput                               = 0,
    DependsOnlyOnUserInput                  = 1,
    DependsOnlyOnDependsOnlyOnUserInput     = 2,
    // asynchronicity starts from here
    DependsOnSelfKind                       = 3
}

//---------------------------------------------------------------------------------------------------------------------
/**
 * The base class for [[Identifier|identifiers]]. It contains only "meta" properties that describes "abstract" identifier.
 * The [[Field]] class inherit from this class.
 *
 * To understand the difference between the "abstract" identifier and the "specific" identifier,
 * imagine a set of instances of the same entity class. Lets say that class has a field "name".
 * All of those instances each will have different "specific" identifiers for the field "name".
 *
 * In the same time, some properties are common for all "specific" identifiers, like [[Meta.equality|equality]], [[Meta.lazy|lazy]] etc.
 * Such properties, that does not change between every "specific" identifier we will call "meta" properties.
 *
 * This class has 2 generic arguments - `ValueT` and `ContextT`. The 1st one defines the type of the identifier's value.
 * The 2nd - the identifier's computation context (synchronous of generator).
 */
export class Meta<ValueT = any, ContextT extends Context = Context> extends Base {
    /**
     * The name of the identifiers. Not an id, does not imply uniqueness.
     */
    name                : any       = undefined

    ArgsT               : any[]
    /**
     * The type of the effects that can be "yielded" from the calculation function
     */
    YieldT              : YieldableValue
    ValueT              : ValueT

    /**
     * [[Levels|Level]] of the identifier. This attribute is supposed to be defined on the prototype level only.
     */
    @prototypeValue(Levels.DependsOnSelfKind)
    level               : Levels

    /**
     * Whether this identifier is lazy (`true`) or strict (`false`).
     *
     * Lazy identifiers are calculated on-demand (when read from graph or used by another identifiers).
     *
     * Strict identifiers will be calculated on read or during the [[ChronoGraph.commit|commit]] call.
     */
    lazy                : boolean   = false

    /**
     * Whether this identifier is sync (`true`) or generator-based (`false`). Default value is `true`.
     * This attribute is supposed to be defined on the prototype level only.
     */
    @prototypeValue(true)
    sync                : boolean

    // no cancels
    total               : boolean   = true

    // no "nested" writes
    pure                : boolean   = true

    quarkClass          : QuarkConstructor

    proposedValueIsBuilt    : boolean   = false

    // no init value - only a type
    CalcContextT        : any


    /**
     * The calculation function of the identifier. Its returning value has a generic type, that is converted to a specific type,
     * based on the generic attribute `ContextT`.
     *
     * This function will receive a single argument - current calculation context (effects handler).
     *
     * When using generators, there's no need to use this handler - one can "yield" the value directly, using the `yield` construct.
     *
     * Compare:
     *
     *     class Author extends Entity.mix(Base) {
     *         @field()
     *         firstName       : string
     *         @field()
     *         lastName        : string
     *         @field()
     *         fullName        : string
     *
     *         @calculate('fullName')
     *         * calculateFullName () : ChronoIterator<string> {
     *             return (yield this.$.firstName) + ' ' + (yield this.$.lastName)
     *         }
     *
     *         @calculate('fullName')
     *         calculateFullName (Y) : string {
     *             return Y(this.$.firstName) + ' ' + Y(this.$.lastName)
     *         }
     *     }
     *
     * @param Y
     */
    calculation (this : this[ 'CalcContextT' ], Y : CalculationContext<this[ 'YieldT' ]>) : Contexts<ValueT, this[ 'YieldT' ]>[ ContextT ] {
        throw new Error("Abstract method `calculation` called")
    }

    /**
     * The equality check of the identifier. By default is performed with `===`.
     *
     * @param v1 First value
     * @param v2 Second value
     */
    equality (v1 : ValueT, v2 : ValueT) : boolean {
        return v1 === v2
    }
}


//---------------------------------------------------------------------------------------------------------------------
/**
 * The generic "specific" identifier class (see [[Meta]] for "abstract" properties). This class is generic in the sense that it does not
 * specify the type of the calculation function - it can be either synchronous or generator-based.
 *
 * It is also low-level and generally not supposed to be used directly in the application. Instead, one should
 * declare identifiers as fields (decorated class properties) in the [[Replica|replica]].
 */
export class Identifier<ValueT = any, ContextT extends Context = Context> extends Meta<ValueT, ContextT> {
    /**
     * The scope (`this` value) for the calculation function.
     */
    context             : this[ 'CalcContextT' ]       = undefined


    newQuark (createdAt : Revision) : InstanceType<this[ 'quarkClass' ]> {
        // micro-optimization - we don't pass a config object to the `new` constructor
        // but instead assign directly to instance
        const newQuark                      = this.quarkClass.new() as InstanceType<this[ 'quarkClass' ]>

        newQuark.createdAt                  = createdAt
        newQuark.identifier                 = this
        newQuark.needToBuildProposedValue   = this.proposedValueIsBuilt

        return newQuark
    }

    write (me : this, transaction : Transaction, quark : InstanceType<this[ 'quarkClass' ]>, proposedValue : ValueT, ...args : this[ 'ArgsT' ]) {
        quark                       = quark || transaction.getWriteTarget(me)

        quark.proposedValue         = proposedValue
        quark.proposedArguments     = args.length > 0 ? args : undefined
    }


    writeToTransaction (transaction : Transaction, proposedValue : ValueT, ...args : this[ 'ArgsT' ]) {
        transaction.write(this, proposedValue, ...args)
    }


    /**
     * Write a value to this identifier, in the context of `graph`.
     *
     * @param graph
     * @param proposedValue
     * @param args
     */
    writeToGraph (graph : ChronoGraph, proposedValue : ValueT, ...args : this[ 'ArgsT' ]) {
        graph.write(this, proposedValue, ...args)
    }


    /**
     * Read the value of this identifier, in the context of `graph`, asynchronously
     * @param graph
     */
    readFromGraphAsync (graph : ChronoGraph) : Promise<ValueT> {
        return graph.readAsync(this)
    }


    /**
     * Read the value of this identifier, in the context of `graph`, synchronously
     * @param graph
     */
    readFromGraph (graph : ChronoGraph) : ValueT {
        return graph.read(this)
    }


    readFromTransaction (transaction : Transaction) : ValueT {
        return transaction.read(this)
    }


    readFromTransactionAsync (transaction : Transaction) : Promise<ValueT> {
        return transaction.readAsync(this)
    }


    // readFromGraphDirtySync (graph : CheckoutI) : ValueT {
    //     return graph.readDirty(this)
    // }


    buildProposedValue (me : this, quark : InstanceType<this[ 'quarkClass' ]>, transaction : Transaction) : ValueT {
        return undefined
    }


    /**
     * Template method, which is called, when this identifier "enters" the graph.
     *
     * @param graph
     */
    enterGraph (graph : ChronoGraph) {
    }


    /**
     * Template method, which is called, when this identifier "leaves" the graph.
     *
     * @param graph
     */
    leaveGraph (graph : ChronoGraph) {
    }
}

/**
 * Constructor for the [[Identifier]] class. Used only for typization purposes, to be able to specify the generics arguments.
 */
export const IdentifierC = <ValueT, ContextT extends Context>(config : Partial<Identifier>) : Identifier<ValueT, ContextT> =>
    Identifier.new(config) as Identifier<ValueT, ContextT>


//@ts-ignore
export const QuarkSync = Quark.mix(CalculationSync.mix(Map))
//@ts-ignore
export const QuarkGen = Quark.mix(CalculationGen.mix(Map))

//---------------------------------------------------------------------------------------------------------------------
/**
 * Variable is a subclass of [[Identifier]], that does not perform any calculation and instead is always equal to a user-provided value.
 * It is a bit more light-weight
 */
export class Variable<ValueT = any> extends Identifier<ValueT, typeof ContextSync> {
    YieldT              : never

    @prototypeValue(Levels.UserInput)
    level               : Levels

    @prototypeValue(QuarkSync)
    quarkClass          : QuarkConstructor


    calculation (this : this[ 'CalcContextT' ], YIELD : CalculationContext<this[ 'YieldT' ]>) : Contexts<ValueT, this[ 'YieldT' ]>[ typeof ContextSync ] {
        throw new Error("The 'calculation' method of the variables will never be called. Instead the value will be set directly to quark")
    }


    write (me : this, transaction : Transaction, quark : Quark, proposedValue : ValueT, ...args : this[ 'ArgsT' ]) {
        quark                       = quark || transaction.getWriteTarget(me)

        quark.value                 = proposedValue
        quark.proposedArguments     = args.length > 0 ? args : undefined
    }
}

/**
 * Constructor for the [[Variable]] class. Used only for typization purposes.
 */
export function VariableC<ValueT> (...args) : Variable<ValueT> {
    return Variable.new(...args) as Variable<ValueT>
}


//---------------------------------------------------------------------------------------------------------------------
/**
 * Subclass of the [[Identifier]], representing synchronous computation.
 */
export class CalculatedValueSync<ValueT = any> extends Identifier<ValueT, typeof ContextSync> {

    @prototypeValue(QuarkSync)
    quarkClass          : QuarkConstructor


    calculation (this : this[ 'CalcContextT' ], YIELD : CalculationContext<this[ 'YieldT' ]>) : Contexts<ValueT, this[ 'YieldT' ]>[ typeof ContextSync ] {
        return YIELD(ProposedOrPrevious)
    }
}

/**
 * Constructor for the [[CalculatedValueSync]] class. Used only for typization purposes.
 */
export function CalculatedValueSyncC<ValueT> (...args) : CalculatedValueSync<ValueT> {
    return CalculatedValueSync.new(...args) as CalculatedValueSync<ValueT>
}


//---------------------------------------------------------------------------------------------------------------------
/**
 * Subclass of the [[Identifier]], representing generator-based computation.
 */
export class CalculatedValueGen<ValueT = any> extends Identifier<ValueT, typeof ContextGen> {

    @prototypeValue(QuarkGen)
    quarkClass          : QuarkConstructor


    * calculation (this : this[ 'CalcContextT' ], YIELD : CalculationContext<this[ 'YieldT' ]>) : Contexts<ValueT, this[ 'YieldT' ]>[ typeof ContextGen ] {
        return yield ProposedOrPrevious
    }
}

/**
 * Constructor for the [[CalculatedValueGen]] class. Used only for typization purposes.
 */
export function CalculatedValueGenC<ValueT> (...args) : CalculatedValueGen<ValueT> {
    return CalculatedValueGen.new(...args) as CalculatedValueGen<ValueT>
}


//---------------------------------------------------------------------------------------------------------------------
export const throwUnknownIdentifier = (identifier : Identifier) => { throw new Error(`Unknown identifier ${identifier}`) }
