import { AnyFunction, Base } from "../class/Mixin.js"
import { Box } from "../primitives/Box.js"
import { CalculationGen, CalculationGenFunction, CalculationSync } from "../primitives/Calculation.js"
import { CalculatedValueGen, CalculatedValueSync, Identifier, isGenSymbol, Variable } from "./Identifier.js"
import { PendingQuarkMarker, QuarkEntry } from "./Revision.js"


//---------------------------------------------------------------------------------------------------------------------
export class QuarkTransitionGen extends CalculationGen(Box(Base)) {
    identifier      : Variable | CalculatedValueGen

    previous        : QuarkEntry
    // TODO switch to lazy property instead of `PendingQuarkMarker`?
    current         : QuarkEntry | PendingQuarkMarker

    edgesFlow       : number


    get calculation () : CalculationGenFunction {
        return this.identifier.calculation
    }


    get calculationContext () : any {
        return this.identifier.calculationContext
    }
}

//---------------------------------------------------------------------------------------------------------------------
export class QuarkTransitionSync extends CalculationSync(Box(Base)) {
    identifier      : Variable | CalculatedValueSync

    previous        : QuarkEntry
    // TODO switch to lazy property instead of `PendingQuarkMarker`?
    current         : QuarkEntry | PendingQuarkMarker

    edgesFlow       : number


    get calculation () : AnyFunction {
        return this.identifier.calculation
    }


    get calculationContext () : any {
        return this.identifier.calculationContext
    }
}

export type QuarkTransition = QuarkTransitionGen | QuarkTransitionSync


//---------------------------------------------------------------------------------------------------------------------
export const getTransitionClass = (identifier : Identifier) : typeof QuarkTransitionSync | typeof QuarkTransitionGen => {
    return identifier[ isGenSymbol ] ? QuarkTransitionGen : QuarkTransitionSync
}
