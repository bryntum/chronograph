import { Base } from "../class/Base.js"
import { CalculationModeUnknown } from "./CalculationMode.js"
import { Atom } from "./data/Immutable.js"
import { EffectHandler } from "./Effect.js"

//---------------------------------------------------------------------------------------------------------------------
export class GlobalContext extends Base {

    activeAtom          : Atom      = undefined

    effectHandler       : EffectHandler<CalculationModeUnknown>    = undefined


    initialize () {
        super.initialize(...arguments)

        this.effectHandler = () => {

        }
    }
}

export const globalContext = GlobalContext.new()
