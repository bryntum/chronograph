import { AnyFunction, Base } from "../class/BetterMixin.js"
import { FieldIdentifierConstructor, MinimalFieldIdentifierGen, MinimalFieldIdentifierSync, MinimalFieldVariable } from "../replica/Identifier.js"
import { EntityMeta } from "./EntityMeta.js"

export type Name    = string
export type Type    = string


//---------------------------------------------------------------------------------------------------------------------
export class Field extends Base {
    ValueT              : any

    name                : Name

    type                : Type

    entity              : EntityMeta

    equality            : (v1 : any, v2 : any) => boolean

    persistent          : boolean   = true

    lazy                : boolean

    identifierCls       : FieldIdentifierConstructor


    getIdentifierClass (calculationFunction : AnyFunction) : FieldIdentifierConstructor {
        if (this.identifierCls) return this.identifierCls

        if (!calculationFunction) return MinimalFieldVariable

        return calculationFunction.constructor.name === 'GeneratorFunction' ? MinimalFieldIdentifierGen : MinimalFieldIdentifierSync
    }
}

