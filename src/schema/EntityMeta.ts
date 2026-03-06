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

    /** Fields defined directly on this entity (not inherited from parent) */
    ownFields           : Map<Name, Field>      = new Map()

    /** The schema this entity belongs to */
    schema              : Schema                = undefined

    /**
     * The parent entity
     */
    parentEntity        : EntityMeta

    /** Internal skeleton object used as a prototype for entity instances */
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


    /**
     * Calls the given function for this entity and each parent entity in the inheritance chain.
     *
     * @param func
     */
    forEachParent (func : (entity : EntityMeta) => any) {
        let entity : EntityMeta         = this

        while (entity) {
            func(entity)

            entity                  = entity.parentEntity
        }
    }


    /** Cached map of all fields (own + inherited), lazily computed */
    $allFields : Map<Name, Field>       = undefined


    /**
     * Returns a map of all fields for this entity, including fields inherited from parent entities.
     * Own fields take priority over inherited fields with the same name. The result is cached.
     */
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
