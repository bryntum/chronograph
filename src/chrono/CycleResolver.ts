import { CycleResolutionInput } from "../cycle_resolver/CycleResolver.js"
import { HasProposedValue, PreviousValueOf } from "./Effect.js"
import { Identifier } from "./Identifier.js"
import { SyncEffectHandler } from "./Transaction.js"


//---------------------------------------------------------------------------------------------------------------------
export class CycleResolutionInputChrono extends CycleResolutionInput {

    collectInfo (YIELD : SyncEffectHandler, identifier : Identifier, symbol : symbol) {
        if (YIELD(PreviousValueOf(identifier)) != null) this.addPreviousValueFlag(symbol)

        if (YIELD(HasProposedValue(identifier))) this.addProposedValueFlag(symbol)
    }
}
