import { CycleResolutionInput, Variable } from "../cycle_resolver/CycleResolver.js"
import { GetTransaction, HasProposedValue, PreviousValueOf } from "./Effect.js"
import { Identifier } from "./Identifier.js"
import { SyncEffectHandler, Transaction } from "./Transaction.js"


//---------------------------------------------------------------------------------------------------------------------
/**
 * A subclass of [[CycleResolutionInput]] with additional convenience method [[collectInfo]].
 */
export class CycleResolutionInputChrono extends CycleResolutionInput {

    /**
     * This method, given an effect handler, identifier and a variable, will add [[CycleResolutionInput.addPreviousValueFlag|previous value]]
     * and [[CycleResolutionInput.addProposedValueFlag|proposed value]] flags for that variable.
     *
     * @param Y An effect handler function, which is given as a 1st argument of every calculation function
     * @param identifier
     * @param symbol
     */
    collectInfo (Y : SyncEffectHandler, identifier : Identifier, symbol : Variable) {
        if (Y(PreviousValueOf(identifier)) != null) this.addPreviousValueFlag(symbol)

        const transaction   = Y(GetTransaction) as Transaction

        if (Y(HasProposedValue(identifier)) && !transaction.graph.isWritingPreviousData) this.addProposedValueFlag(symbol)
    }
}
