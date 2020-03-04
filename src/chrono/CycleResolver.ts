import { CycleResolutionInput } from "../cycle_resolver/CycleResolver.js"
import { HasProposedValue, PreviousValueOf } from "./Effect.js"
import { Identifier } from "./Identifier.js"
import { SyncEffectHandler } from "./Transaction.js"


//---------------------------------------------------------------------------------------------------------------------
/**
 * A subclass of [[CycleResolutionInput]] with additional convenience method.
 */
export class CycleResolutionInputChrono extends CycleResolutionInput {

    /**
     * This method, given a effect handler, identifier and a 
     * 
     * @param YIELD An effect handler function, which is given as 1st argument of every calculation function
     * @param identifier
     * @param symbol
     */
    collectInfo (YIELD : SyncEffectHandler, identifier : Identifier, symbol : symbol) {
        if (YIELD(PreviousValueOf(identifier)) != null) this.addPreviousValueFlag(symbol)

        if (YIELD(HasProposedValue(identifier))) this.addProposedValueFlag(symbol)
    }
}
