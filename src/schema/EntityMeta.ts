import { Base } from "../class/Base.js"
import { Field, Name } from "./Field.js"
import { Schema } from "./Schema.js"

//---------------------------------------------------------------------------------------------------------------------
/**
 * This class describes an entity. Entity is simply a collection of [[Field]]s. Entity also may have a parent entity,
 * from which it inherit the fields.
 */
export class EntityMeta extends Base {
    /**
     * The name of the entity
     */
    name                : Name                  = undefined

    ownFields           : Map<Name, Field>      = new Map()

    schema              : Schema                = undefined

    /**
     * The parent entity
     */
    parentEntity        : EntityMeta

    $skeleton           : object                = {}


    /**
     * Checks whether the entity has a field with given name (possibly inherited from parent entity).
     *
     * @param name
     */
    hasField (name : Name) : boolean {
        return this.getField(name) !== undefined
    }


    /**
     * Returns a field with given name (possibly inherited) or `undefined` if there's none.
     *
     * @param name
     */
    getField (name : Name) : Field {
        return this.allFields.get(name)
    }


    /**
     * Adds a field to this entity.
     *
     * @param field
     */
    addField <T extends Field> (field : T) : T {
        const name      = field.name
        if (!name) throw new Error(`Field must have a name`)

        if (this.ownFields.has(name)) throw new Error(`Field with name [${name}] already exists`)

        field.entity    = this

        this.ownFields.set(name, field)

        return field
    }


    forEachParent (func : (entity : EntityMeta) => any) {
        let entity : EntityMeta         = this

        while (entity) {
            func(entity)

            entity                  = entity.parentEntity
        }
    }


    $allFields : Map<Name, Field>       = undefined


    get allFields () : Map<Name, Field> {
        if (this.$allFields !== undefined) return this.$allFields

        const allFields : Map<Name, Field>  = new Map()
        const visited : Set<Name>           = new Set()

        this.forEachParent(entity => {
            entity.ownFields.forEach((field : Field, name : Name) => {
                if (!visited.has(name)) {
                    visited.add(name)

                    allFields.set(name, field)
                }
            })
        })

        return this.$allFields = allFields
    }


    /**
     * Iterator for all fields of this entity (including inherited).
     *
     * @param func
     */
    forEachField (func : (field : Field, name : Name) => any) {
        this.allFields.forEach(func)
    }
}
