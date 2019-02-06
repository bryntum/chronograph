import {Base} from "../class/Mixin.js";
import {Field, Name} from "./Field.js";
import {Schema} from "./Schema.js";

//---------------------------------------------------------------------------------------------------------------------
export class Entity extends Base {
    name                : Name

    fields              : Map<Name, Field>      = new Map()

    schema              : Schema

    parentEntity        : Entity


    hasField (name : Name) : boolean {
        return this.fields.has(name)
    }


    getField (name : Name) : Field {
        return this.fields.get(name)
    }


    addField <T extends Field>(field : T) : T {
        const name      = field.name

        if (!name) throw new Error(`Field must have a name`)

        if (this.hasField(name)) throw new Error(`Field with name [${String(name)}] already exists`)

        field.entity    = this

        this.fields.set(name, field)

        return field
    }


    forEachField (func : (field : Field, name : Name) => void) {
        const visited : Set<Name>   = new Set()

        let target : Entity         = this

        while (target) {
            target.fields.forEach((field : Field, name : Name) => {
                if (!visited.has(name)) {
                    visited.add(name)

                    func(field, name)
                }
            })

            target                  = target.parentEntity
        }
    }
}
