import { AnyConstructor, Mixin } from "../class/Mixin.js"


//---------------------------------------------------------------------------------------------------------------------
export const Box = <T extends AnyConstructor<object>>(base : T) =>

class Box extends base {
    ValueT      : any


    get value () : this[ 'ValueT' ] {
        return this.valueOf()
    }


    hasValue () : boolean {
        return this.value !== undefined
    }
}

export type Box = Mixin<typeof Box>
