import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { MinimalRevision, Revision } from "./Revision.js"
import { Scope } from "./Scope.js"


//---------------------------------------------------------------------------------------------------------------------
export const ChronoGraph = <T extends AnyConstructor<Scope>>(base : T) =>

class ChronoGraph extends base {

    baseRevision        : Revision      = MinimalRevision.new()


    branch () : this {
        return this.derive()
    }
}

export type ChronoGraph = Mixin<typeof ChronoGraph>

export class MinimalChronoGraph extends ChronoGraph(Scope(Base)) {}
