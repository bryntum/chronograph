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

    listeners           : Name[]

    listens             : Name[]

    equality            : (v1 : any, v2 : any) => boolean

    persistent          : boolean   = true

    lazy                : boolean   = false

    identifierCls       : FieldIdentifierConstructor  = MinimalFieldIdentifier
}

