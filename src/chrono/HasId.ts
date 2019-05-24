import { chronoId, ChronoId } from "../chrono/Id.js"
import { AnyConstructor, Mixin } from "../class/Mixin.js"


//---------------------------------------------------------------------------------------------------------------------
export const HasId = <T extends AnyConstructor<object>>(base : T) =>

class HasId extends base {
    id      : ChronoId = chronoId()
}

export type HasId = Mixin<typeof HasId>
