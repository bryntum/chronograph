import { AnyConstructor, Mixin } from "../class/BetterMixin.js"
import { CalculationIterator } from "../primitives/Calculation.js"
import { Checkout } from "./Checkout.js"
import { Revision } from "./Revision.js"


export type ChronoIterator<ResultT, YieldT = any> = CalculationIterator<ResultT, YieldT>

//---------------------------------------------------------------------------------------------------------------------
export class ChronoGraph extends Mixin(
    [ Checkout ],
    <T extends AnyConstructor<Checkout>>(base : T) =>

class ChronoGraph extends base {
    baseRevision        : Revision      = Revision.new()
}){}

// backward compat
export const MinimalChronoGraph = ChronoGraph
