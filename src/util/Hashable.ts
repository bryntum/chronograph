import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"

//=====================================================
export class Hashable extends Mixin(
    [ Base ],

    <T extends AnyConstructor<Base>>(base : T) => {
//-----------------------------------------------------

class Hashable extends base {



}

//-----------------------------------------------------
return Hashable
    }
){}
//=====================================================
