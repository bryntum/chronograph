import { Meta } from "../chrono/Identifier.js"
import { AnyFunction } from "../class/BetterMixin.js"
import { Context } from "../primitives/Calculation.js"
import { FieldIdentifierConstructor, MinimalFieldIdentifierGen, MinimalFieldIdentifierSync, MinimalFieldVariable } from "../replica/Identifier.js"
import { EntityMeta } from "./EntityMeta.js"

export type Name    = string
export type Type    = string


//---------------------------------------------------------------------------------------------------------------------
export class Field<ValueT = any, ContextT extends Context = Context> extends Meta<ValueT, ContextT> {
    type                : Type

    entity              : EntityMeta

    persistent          : boolean   = true

    identifierCls       : FieldIdentifierConstructor


    getIdentifierClass (calculationFunction : AnyFunction) : FieldIdentifierConstructor {
        if (this.identifierCls) return this.identifierCls

        if (!calculationFunction) return MinimalFieldVariable

        return calculationFunction.constructor.name === 'GeneratorFunction' ? MinimalFieldIdentifierGen : MinimalFieldIdentifierSync
    }
}

