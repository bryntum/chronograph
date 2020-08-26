import { Meta } from "../chrono2/atom/Meta.js"
import { AnyConstructor } from "../class/Mixin.js"
import { FieldAtomConstructor, FieldBox, FieldCalculableBox, FieldCalculableBoxGen } from "../replica2/Atom.js"
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
export class Field extends Meta {
    type                : Type                      = undefined

    /**
     * Reference to the [[EntityMeta]] this field belongs to.
     */
    entity              : EntityMeta                = undefined

    /**
     * Boolean flag, indicating whether this field should be persisted
     */
    persistent          : boolean                   = true

    /**
     * The class of the identifier, that will be used to instantiate a specific identifier from this field.
     */
    atomCls             : FieldAtomConstructor      = undefined


    getAtomClass () : FieldAtomConstructor {
        if (this.atomCls) return this.atomCls

        if (!this.calculation) return FieldBox

        return isGeneratorFunction(this.calculation) ? FieldCalculableBoxGen : FieldCalculableBox
    }


    clone () : this {
        const clone                     = super.clone()

        clone.type                      = this.type
        clone.entity                    = this.entity
        clone.persistent                = this.persistent
        clone.atomCls                   = this.atomCls

        return clone
    }
}

