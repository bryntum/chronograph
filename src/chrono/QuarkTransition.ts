import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { VisitInfo } from "../graph/WalkDepth.js"
import { CalculationContext, CalculationGen, CalculationSync, GenericCalculation } from "../primitives/Calculation.js"
import { Identifier } from "./Identifier.js"
import { Quark, QuarkI } from "./Quark.js"


//---------------------------------------------------------------------------------------------------------------------
export const QuarkTransition = <T extends AnyConstructor<Base & GenericCalculation<any, any, [ CalculationContext<any> ]>>>(base : T) => {

    class QuarkTransition extends base implements VisitInfo {
        quark           : QuarkI

        previous        : QuarkI

        edgesFlow       : number

        visitedAt               : number
        visitedTopologically    : boolean


        get identifier () : Identifier {
            return this.quark.identifier
        }


        get calculation () : this[ 'identifier' ][ 'calculation' ] {
            return this.quark.identifier.calculation
        }


        get context () : this[ 'identifier' ][ 'context' ] {
            return this.quark.identifier.context
        }


        forceCalculation () {
            this.edgesFlow  = 1e9
        }
    }

    return QuarkTransition
}

export type QuarkTransition = Mixin<typeof QuarkTransition>


//---------------------------------------------------------------------------------------------------------------------
export class QuarkTransitionGen extends QuarkTransition(CalculationGen(Base)) {}

//---------------------------------------------------------------------------------------------------------------------
export class QuarkTransitionSync extends QuarkTransition(CalculationSync(Base)) {}
