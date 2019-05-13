import { ChronoValue } from "../chrono/Atom.js"
import { Base, MixinConstructor } from "../class/Mixin.js"
import { FieldAtom, MinimalFieldAtom } from "../replica/Atom.js"
import { Entity } from "./Entity.js"

export type Name    = string
export type Type    = string

//---------------------------------------------------------------------------------------------------------------------
export type ConverterFunc    = (value : ChronoValue, field : Field) => ChronoValue

//---------------------------------------------------------------------------------------------------------------------
export class Field extends Base {
    name                : Name

    type                : Type

    entity              : Entity

    persistent          : boolean   = true

    createAccessors     : boolean   = true

    converter           : ConverterFunc

    atomCls             : MixinConstructor<typeof FieldAtom>   = MinimalFieldAtom
}

