import { ClassUnion, Mixin } from "../class/BetterMixin.js"
import { CalculationIterator } from "../primitives/Calculation.js"
import { Checkout } from "./Checkout.js"
import { Revision } from "./Revision.js"


export type ChronoIterator<ResultT, YieldT = any> = CalculationIterator<ResultT, YieldT>

//---------------------------------------------------------------------------------------------------------------------
export class ChronoGraph extends Mixin(
    [ Checkout ],
    (base : ClassUnion<typeof Checkout>) =>

class ChronoGraph extends base {
    baseRevision        : Revision      = Revision.new()
}){}
