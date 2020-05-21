import { Meta } from "../chrono/Identifier.js"
import { AnyFunction } from "../class/Mixin.js"
import { Context } from "../primitives/Calculation.js"
import { FieldIdentifierConstructor, MinimalFieldIdentifierGen, MinimalFieldIdentifierSync, MinimalFieldVariable } from "../replica/Identifier.js"
import { isGeneratorFunction } from "../util/Helpers.js"
import { EntityMeta } from "./EntityMeta.js"

/**
 * Type for the name of the entities/fields, just an alias to `string`
 */
export type Name    = string

/**
 * Type for the type of the fields, just an alias to `string`
 */
export type Type    = string


//---------------------------------------------------------------------------------------------------------------------
/**
 * This class describes a field of some [[EntityMeta]].
 */
export class Field<ValueT = any, ContextT extends Context = Context> extends Meta<ValueT, ContextT> {
    type                : Type

    /**
     * Reference to the [[EntityMeta]] this field belongs to.
     */
    entity              : EntityMeta

    /**
     * Boolean flag, indicating whether this field should be persisted
     */
    persistent          : boolean   = true

    /**
     * The class of the identifier, that will be used to instantiate a specific identifier from this field.
     */
    identifierCls       : FieldIdentifierConstructor


    getIdentifierClass (calculationFunction : AnyFunction) : FieldIdentifierConstructor {
        if (this.identifierCls) return this.identifierCls

        if (!calculationFunction) return MinimalFieldVariable

        return isGeneratorFunction(calculationFunction) ? MinimalFieldIdentifierGen : MinimalFieldIdentifierSync
    }
}

