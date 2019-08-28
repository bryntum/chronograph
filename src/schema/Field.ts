import { Base } from "../class/Mixin.js"
import { prototypeValue } from "../util/Helpers.js"
import { Entity } from "./Entity.js"

export type Name    = string
export type Type    = string


//---------------------------------------------------------------------------------------------------------------------
export class Field extends Base {
    ValueT              : any

    name                : Name

    type                : Type

    entity              : Entity

    @prototypeValue(true)
    persistent          : boolean


    converter (value : any) : this[ 'ValueT' ] {
        return value
    }

    // atomCls             : MixinConstructor<typeof FieldAtom>   = MinimalFieldAtom
}

