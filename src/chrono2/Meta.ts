import { Base } from "../class/Base.js"
import { CalculationModeUnknown, CalculationReturnValue } from "./CalculationMode.js"
import { EffectHandler } from "./Effect.js"

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
 * The 2nd - the identifier's computation context (synchronous or generator).
 */
export class Meta<V> extends Base {
    /**
     * The name of the identifiers. Not an id, does not imply uniqueness.
     */
    name                : string        = undefined

    /**
     * The type of the effects that can be "yielded" from the calculation function
     */
    YieldT              : unknown
    ValueT              : V
    CalcContextT        : unknown

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
    sync                : boolean   = true

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
    calculation (this : this[ 'CalcContextT' ], Y : EffectHandler<CalculationModeUnknown, this[ 'YieldT' ]>)
        : CalculationReturnValue<CalculationModeUnknown, this[ 'ValueT' ], this[ 'YieldT' ]>
    {
        throw new Error("Abstract method `calculation` called")
    }

    /**
     * The equality check of the identifier. By default is performed with `===`.
     *
     * @param v1 First value
     * @param v2 Second value
     */
    equality (v1 : this[ 'ValueT' ], v2 : this[ 'ValueT' ]) : boolean {
        return v1 === v2
    }
}


