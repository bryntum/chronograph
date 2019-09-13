import { Base } from "../class/Mixin.js"
import { FieldIdentifierConstructor, MinimalFieldIdentifier } from "../replica/Identifier.js"
import { EntityMeta } from "./EntityMeta.js"

export type Name    = string
export type Type    = string


//---------------------------------------------------------------------------------------------------------------------
export class Field extends Base {
    ValueT              : any

    name                : Name

    type                : Type

    entity              : EntityMeta

    persistent          : boolean   = true


    // converter (value : any) : this[ 'ValueT' ] {
    //     return value
    // }

    identifierCls       : FieldIdentifierConstructor  = MinimalFieldIdentifier
}

