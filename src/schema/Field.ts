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
    /** The type of the field (e.g., `'string'`, `'number'`, `'date'`) */
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

    /** When `true`, the identifier created from this field will ignore edge flow counts and always recalculate */
    ignoreEdgesFlow     : boolean   = false


    /**
     * Returns the appropriate identifier class for this field based on the calculation function.
     * If no calculation function is provided, returns a variable identifier class.
     * Otherwise, returns a generator or sync identifier class based on the function type.
     *
     * @param calculationFunction The calculation function, if any
     */
    getIdentifierClass (calculationFunction : AnyFunction) : FieldIdentifierConstructor {
        if (this.identifierCls) return this.identifierCls

        if (!calculationFunction) return MinimalFieldVariable

        return isGeneratorFunction(calculationFunction) ? MinimalFieldIdentifierGen : MinimalFieldIdentifierSync
    }
}

