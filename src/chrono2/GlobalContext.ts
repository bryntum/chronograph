import { Base } from "../class/Base.js"
import { ChronoGraph } from "./Graph.js"
import { Quark } from "./Quark.js"

//---------------------------------------------------------------------------------------------------------------------
export class GlobalContext extends Base {

    activeQuark         : Quark          = undefined
    activeGraph         : ChronoGraph    = undefined

    // effectHandler       : EffectHandler<CalculationMode>    = undefined


    // initialize () {
    //     super.initialize(...arguments)
    //
    //     this.effectHandler = () => {
    //     }
    // }


    calculateAtoms (stack : Quark[]) {
        // while (stack.length) {
        //     const atom      = stack[ stack.length - 1 ]
        //
        //     if (atom.state === QuarkState.UpToDate) {
        //         stack.pop()
        //         continue
        //     }
        //
        //     atom.calculate(stack)
        // }
    }
}

export const globalContext = GlobalContext.new()
