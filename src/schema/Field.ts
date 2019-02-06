import {Base} from "../class/Mixin.js";
import {MinimalFieldAtom} from "../replica/Atom.js";
import {Entity} from "./Entity.js";

export type Name    = string
export type Type    = string


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

    atomCls             : typeof MinimalFieldAtom   = MinimalFieldAtom
}

