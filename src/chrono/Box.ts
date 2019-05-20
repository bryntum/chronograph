import { AnyConstructor, Mixin } from "../class/Mixin.js"

// TODO figure out the best way to box the native primitives like number and string
// this implementation overrides the `valueOf` method


//---------------------------------------------------------------------------------------------------------------------
export const Box = <T extends AnyConstructor<object>>(base : T) =>

class Box extends base {
    valueT      : any

    value       : this[ 'valueT' ]

    valueOf () : this[ 'valueT' ] {
        return this.value
    }
}

export type Box = Mixin<typeof Box>

