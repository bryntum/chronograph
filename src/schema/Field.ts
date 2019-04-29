import { ChronoValue } from "../chrono/Atom.js";
import { Base, MixinConstructor } from "../class/Mixin.js";
import { FieldAtom, MinimalFieldAtom } from "../replica/Atom.js";
import { Entity } from "./Entity.js";

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

    // support for setting the same final value for initial atoms
    // this flag indicates that atom should ignore its value during commit - it will come from the final atom instead
    continued           : boolean   = false
    continuationOf      : Field

    converter           : ConverterFunc

    atomCls             : MixinConstructor<typeof FieldAtom>   = MinimalFieldAtom
}

