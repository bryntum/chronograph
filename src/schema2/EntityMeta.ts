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
    ownCalculationMappings : Map<Name, Name>    = new Map()

    schema              : Schema                = undefined

    /**
     * The parent entity
     */
    parentEntity        : EntityMeta            = undefined

    proto               : object                = undefined


    /**
     * Checks whether the entity has a field with given name (possibly inherited from parent entity).
     *
     * @param name
     */
    hasField (name : Name) : boolean {
        return this.fields.has(name)
    }


    /**
     * Returns a field with given name (possibly inherited) or `undefined` if there's none.
     *
     * @param name
     */
    getField (name : Name) : Field {
        return this.fields.get(name)
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


    addCalculationMapping (fieldName : Name, calculationMethodName : Name) {
        this.ownCalculationMappings.set(fieldName, calculationMethodName)
    }


    forEachParent (func : (entity : EntityMeta) => any) {
        let entity : EntityMeta         = this

        while (entity) {
            func(entity)

            entity                  = entity.parentEntity
        }
    }


    $fields : Map<Name, Field>       = undefined

    get fields () : Map<Name, Field> {
        if (this.$fields !== undefined) return this.$fields

        const fields        = new Map(this.parentEntity ? this.parentEntity.fields : undefined)

        if (this.parentEntity) {
            fields.forEach((field, name) => {
                const calculation       = this.proto[ this.calculationMappings.get(name) ]

                if (field.calculation !== calculation && !this.ownFields.has(name)) {
                    const clone         = field.clone()

                    clone.calculation   = calculation

                    fields.set(name, clone)
                }
            })
        }

        this.ownFields.forEach((field, name) => {
            field.calculation       = this.proto[ this.calculationMappings.get(name) ]

            fields.set(name, field)
        })

        return this.$fields = fields
    }

    $calculationMappings : Map<Name, Name>       = undefined

    get calculationMappings () : Map<Name, Name> {
        if (this.$calculationMappings !== undefined) return this.$calculationMappings

        const calculationMappings : Map<Name, Name>     = new Map()
        const visited : Set<Name>                       = new Set()

        this.forEachParent(entity => {
            entity.ownCalculationMappings.forEach((calculationMethodName : Name, fieldName : Name) => {
                if (!visited.has(fieldName)) {
                    visited.add(fieldName)

                    calculationMappings.set(fieldName, calculationMethodName)
                }
            })
        })

        return this.$calculationMappings = calculationMappings
    }

    /**
     * Iterator for all fields of this entity (including inherited).
     *
     * @param func
     */
    forEachField (func : (field : Field, name : Name) => any) {
        this.fields.forEach(func)
    }
}