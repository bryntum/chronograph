import { Base } from "../class/Mixin.js"
import { lazyProperty } from "../util/Helpers.js"
import { Field, Name } from "./Field.js"
import { Schema } from "./Schema.js"

//---------------------------------------------------------------------------------------------------------------------
export class Entity extends Base {
    name                : Name

    ownFields           : Map<Name, Field>      = new Map()

    schema              : Schema

    parentEntity        : Entity


    hasField (name : Name) : boolean {
        return this.getField(name) !== undefined
    }


    getField (name : Name) : Field {
        return this.allFields.get(name)
    }


    addField <T extends Field> (field : T) : T {
        const name      = field.name
        if (!name) throw new Error(`Field must have a name`)

        if (this.ownFields.has(name)) throw new Error(`Field with name [${name}] already exists`)

        field.entity    = this

        this.ownFields.set(name, field)

        return field
    }


    forEachParent (func : (entity : Entity) => any) {
        let entity : Entity         = this

        while (entity) {
            func(entity)

            entity                  = entity.parentEntity
        }
    }


    get allFields () : Map<Name, Field> {
        return lazyProperty(this, 'allFields', () => {
            const allFields             = new Map()
            const visited : Set<Name>   = new Set()

            this.forEachParent(entity => {
                entity.ownFields.forEach((field : Field, name : Name) => {
                    if (!visited.has(name)) {
                        visited.add(name)

                        allFields.set(field, name)
                    }
                })
            })

            return allFields
        })
    }


    forEachField (func : (field : Field, name : Name) => any) {
        this.allFields.forEach(func)
    }
}
