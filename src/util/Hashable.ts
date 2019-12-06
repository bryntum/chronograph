import { mixin } from "../class/InstanceOf.js"
import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"

//=====================================================
export const Hashable = mixin(
    [ Base ],

    <T extends AnyConstructor<Base>>(base : T) => {
//-----------------------------------------------------

class Hashable extends base {

    

}

//-----------------------------------------------------
return Hashable
    }
)

export type Hashable = Mixin<typeof Hashable>
//=====================================================
