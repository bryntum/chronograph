import { Base } from "../class/Mixin.js";
import { Field, Name } from "./Field.js";
import { Schema } from "./Schema.js";

export const IteratorReturnedEarly  = Symbol("IteratorReturnedEarly")
export type IteratorResult          = typeof IteratorReturnedEarly | void

//---------------------------------------------------------------------------------------------------------------------
export class Entity extends Base {
    name                : Name

    fields              : Map<Name, Field>      = new Map()

    schema              : Schema

    parentEntity        : Entity


    hasField (name : Name) : boolean {
        return this.getField(name) !== undefined
    }


    getField (name : Name) : Field {
        let result : Field  = undefined

        this.forEachParent(entity => {
            const field     = entity.fields.get(name)

            if (field) {
                result      = field

                return IteratorReturnedEarly
            }
        })

        return result
    }


    addField <T extends Field>(field : T) : T {
        const name      = field.name
        if (!name) throw new Error(`Field must have a name`)

        if (this.fields.has(name)) throw new Error(`Field with name [${String(name)}] already exists`)

        field.entity    = this

        this.fields.set(name, field)

        return field
    }


    forEachParent (func : (Entity) => IteratorResult) : IteratorResult {
        let entity : Entity         = this

        while (entity) {
            if (func(entity) === IteratorReturnedEarly) return IteratorReturnedEarly

            entity                  = entity.parentEntity
        }
    }


    forEachField (func : (field : Field, name : Name) => void) {
        const visited : Set<Name>   = new Set()

        this.forEachParent(entity => {
            entity.fields.forEach((field : Field, name : Name) => {
                if (!visited.has(name)) {
                    visited.add(name)

                    func(field, name)
                }
            })
        })
    }
}
