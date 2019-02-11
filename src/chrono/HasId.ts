import {chronoId, ChronoId} from "../chrono/Id.js";
import {Base, AnyConstructor, Mixin} from "../class/Mixin.js";


//---------------------------------------------------------------------------------------------------------------------
export const HasId = <T extends AnyConstructor<Base>>(base: T) =>

class HasId extends base {
    id      : ChronoId = chronoId()
}

export type HasId = Mixin<typeof HasId>
