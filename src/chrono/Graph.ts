import { ClassUnion, Mixin } from "../class/BetterMixin.js"
import { CalculationIterator } from "../primitives/Calculation.js"
import { Checkout } from "./Checkout.js"
import { Revision } from "./Revision.js"
import { YieldableValue } from "./Transaction.js"

/**
 * Type, that represent the return value of the identifier's calculation function (when its based on generator).
 * The `Result` argument corresponds to the type of the value being computed.
 *
 * For example:
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
 *     }
 */
export type ChronoIterator<ResultT, YieldT = any> = CalculationIterator<ResultT, YieldT>

//---------------------------------------------------------------------------------------------------------------------
/**
 * Generic reactive graph. Consists from [[Identifier]]s, depending on each other. This is a low-level representation
 * of the ChronoGraph dataset, it is not "aware" of the entity/relation framework and operates as "just graph".
 */
export class ChronoGraph extends Mixin(
    [ Checkout ],
    (base : ClassUnion<typeof Checkout>) =>

class ChronoGraph extends base {
    baseRevision        : Revision      = Revision.new()
}){}
