import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { CalculationContext, CalculationGen, CalculationSync, Context, GenericCalculation } from "../primitives/Calculation.js"
import { Identifier } from "./Identifier.js"


//---------------------------------------------------------------------------------------------------------------------
export const QuarkTransition = <T extends AnyConstructor<Base & GenericCalculation<Context, any, any, [ CalculationContext<any>, ...any[] ]>>>(base : T) => {

    class QuarkTransition extends base {
        // current         : QuarkEntry
        // previous        : QuarkEntry
        //
        // edgesFlow       : number
        //
        // visitedAt               : number
        // visitedTopologically    : boolean


        identifier          : Identifier

        // get identifier () : Identifier {
        //     return this.current.identifier
        // }


        get calculation () : this[ 'identifier' ][ 'calculation' ] {
            return this.identifier.calculation
        }


        get context () : this[ 'identifier' ][ 'context' ] {
            return this.identifier.context || this.identifier
        }


        // forceCalculation () {
        //     this.edgesFlow  = MAX_SMI
        // }
    }

    return QuarkTransition
}

export type QuarkTransition = Mixin<typeof QuarkTransition>


//---------------------------------------------------------------------------------------------------------------------
export class QuarkTransitionGen extends QuarkTransition(CalculationGen(Base)) {}

//---------------------------------------------------------------------------------------------------------------------
export class QuarkTransitionSync extends QuarkTransition(CalculationSync(Base)) {}
