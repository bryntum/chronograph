import { Base } from "../../class/Base.js"
import { AnyConstructor } from "../../class/Mixin.js"
import { Equality, strictEquality } from "../../util/Helpers.js"
import { CalculationFunction, CalculationMode, CalculationModeSync } from "../CalculationMode.js"

//---------------------------------------------------------------------------------------------------------------------
export enum AtomCalculationPriorityLevel {
    UserInput                               = 0,
    DependsOnlyOnUserInput                  = 1,
    DependsOnlyOnDependsOnlyOnUserInput     = 2,
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
 * The 2nd - the identifier's computation context (synchronous or generator).
 */
export class Meta extends Base {
    /**
     * The name of the identifiers. Not an id, does not imply uniqueness.
     */
    name                : string    = undefined

    /**
     * Whether this identifier is lazy (`true`) or strict (`false`).
     *
     * Lazy identifiers are calculated on-demand (when read from graph or used by another identifiers).
     *
     * Strict identifiers will be calculated on read or during the [[ChronoGraph.commit|commit]] call.
     */
    lazy                : boolean   = true

    level               : AtomCalculationPriorityLevel    = AtomCalculationPriorityLevel.DependsOnSelfKind

    /**
     * Whether this identifier is sync (`true`) or generator-based (`false`). Default value is `true`.
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
    calculation : CalculationFunction<unknown, CalculationMode>     = undefined

    calculationEtalon : CalculationFunction<unknown, CalculationModeSync>     = undefined

    /**
     * The equality check of the identifier. By default is performed with `===`.
     *
     * @param v1 First value
     * @param v2 Second value
     */
    equality : Equality                                             = strictEquality


    clone () : this {
        const cls                       = this.constructor as AnyConstructor<this, typeof Meta>

        const clone                     = new cls()

        clone.name                      = this.name
        clone.lazy                      = this.lazy
        clone.level                     = this.level
        clone.sync                      = this.sync
        clone.calculation               = this.calculation
        clone.calculationEtalon         = this.calculationEtalon
        clone.equality                  = this.equality

        return clone
    }
}

// export const defaultCalculationSync = (Y : EffectHandler<CalculationModeSync>) => {
//     // return Y(ProposedOrPrevious)
//
//     // return globalContext.activeQuark.owner.readProposeOrPrevious()
// }

export const DefaultMetaSync = Meta.new({ name : 'DefaultMetaSync' })
