import { Base } from "../class/Mixin.js"
import { Field, Name } from "./Field.js"
import { Schema } from "./Schema.js"

//---------------------------------------------------------------------------------------------------------------------
export class EntityMeta extends Base {
    name                : Name

    ownFields           : Map<Name, Field>      = new Map()

    schema              : Schema

    parentEntity        : EntityMeta


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


    forEachParent (func : (entity : EntityMeta) => any) {
        let entity : EntityMeta         = this

        while (entity) {
            func(entity)

            entity                  = entity.parentEntity
        }
    }


    _allFields : Map<Name, Field>       = undefined


    get allFields () : Map<Name, Field> {
        if (this._allFields !== undefined) return this._allFields

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

        return this._allFields = allFields
    }


    forEachField (func : (field : Field, name : Name) => any) {
        this.allFields.forEach(func)
    }
}
