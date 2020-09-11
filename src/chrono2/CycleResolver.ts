import { CycleResolutionInput, Variable } from "../cycle_resolver/CycleResolver.js"
import { Atom } from "./atom/Atom.js"
import { CalculationModeSync } from "./CalculationMode.js"
import { EffectHandler, HasProposedValue, PreviousValueOf } from "./Effect.js"


//---------------------------------------------------------------------------------------------------------------------
/**
 * A subclass of [[CycleResolutionInput]] with additional convenience method [[collectInfo]].
 */
export class CycleResolutionInputChrono2 extends CycleResolutionInput {

    /**
     * This method, given an effect handler, identifier and a variable, will add [[CycleResolutionInput.addPreviousValueFlag|previous value]]
     * and [[CycleResolutionInput.addProposedValueFlag|proposed value]] flags for that variable.
     *
     * @param Y An effect handler function, which is given as a 1st argument of every calculation function
     * @param identifier
     * @param symbol
     */
    collectInfo (Y : EffectHandler<CalculationModeSync>, atom : Atom, symbol : Variable) {
        if (Y(PreviousValueOf(atom)) != null) this.addPreviousValueFlag(symbol)

        if (Y(HasProposedValue(atom))) this.addProposedValueFlag(symbol)
    }
}
