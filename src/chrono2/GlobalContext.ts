import { Base } from "../class/Base.js"
import { CalculationMode } from "./CalculationMode.js"
import { Atom } from "./data/Immutable.js"
import { EffectHandler } from "./Effect.js"

//---------------------------------------------------------------------------------------------------------------------
export class GlobalContext extends Base {

    activeAtom          : Atom      = undefined

    effectHandler       : EffectHandler<CalculationMode>    = undefined


    initialize () {
        super.initialize(...arguments)

        this.effectHandler = () => {
        }
    }


    calculateAtoms (stack : Atom[]) {
        while (stack.length) {
            const atom      = stack[ stack.length - 1 ]

            if (atom.hasValue() && !atom.isStale()) {
                stack.pop()
                continue
            }

            stack.push(...atom.getIncoming())

            atom.calculate()
        }
    }
}

export const globalContext = GlobalContext.new()
