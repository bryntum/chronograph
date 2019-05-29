import { AnyConstructor, Mixin } from "../class/Mixin.js"
import { MinimalNode, Node } from "../graph/Node.js"
import { Box } from "../primitives/Box.js"
import { Calculation, CalculationFunction } from "../primitives/Calculation.js"
import { Identifier } from "../primitives/Identifier.js"


//---------------------------------------------------------------------------------------------------------------------
export const Quark = <T extends AnyConstructor<Node & Calculation>>(base : T) =>

class Quark extends base {
    NodeT               : Quark

    identifier          : Identifier


    get calculation () : CalculationFunction {
        return this.identifier.calculation
    }


    get calculationContext () : any {
        return this.identifier.calculationContext
    }
}

export type Quark = Mixin<typeof Quark>


export class MinimalQuark extends Quark(Calculation(Box(MinimalNode))) {
    NodeT               : Quark
}

