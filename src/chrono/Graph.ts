import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { Checkout } from "./Checkout.js"
import { MinimalRevision, Revision } from "./Revision.js"


//---------------------------------------------------------------------------------------------------------------------
export const ChronoGraph = <T extends AnyConstructor<Checkout>>(base : T) =>

class ChronoGraph extends base {
    baseRevision        : Revision      = MinimalRevision.new()
}

export type ChronoGraph = Mixin<typeof ChronoGraph>

export class MinimalChronoGraph extends ChronoGraph(Checkout(Base)) {}
