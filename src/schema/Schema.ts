import {Base} from "../class/Mixin.js";

export type Name    = string | Symbol
export type Type    = string


//---------------------------------------------------------------------------------------------------------------------
export class Field extends Base {
    name                : Name
    type                : Type
}


//---------------------------------------------------------------------------------------------------------------------
export class Entity extends Base {
    name                : Name

    fields              : Map<Name, Field>      = new Map()


    hasField (name : Name) : boolean {
        return this.fields.has(name)
    }


    field (name : Name) : Field {
        return this.fields.get(name)
    }


    createField (name : Name) : Field {
        if (this.hasField(name)) throw new Error(`Field with name [${name}] already exists`)

        const field         = Field.new()

        this.fields.set(name, field)

        return field
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class Schema extends Base {
    name                : Name

    entities            : Map<Name, Entity>     = new Map()


    hasEntity (name : Name) : boolean {
        return this.entities.has(name)
    }


    entity (name : Name) : Entity {
        return this.entities.get(name)
    }


    createEntity (name : Name) : Entity {
        if (this.hasEntity(name)) throw new Error(`Entity with name [${name}] already exists`)

        const entity        = Entity.new()

        this.entities.set(name, entity)

        return entity
    }


    // entityDecorator (name : Name) {
    //     return () => {
    //
    //     }
    // }
}



// export const atom           = (...args) : any => {}
// export const field          = (...args) : any => {}
// export const entity         = (...args) : any => {}
// export const as             = (...args) : any => {}
// export const lifecycle      = (...args) : any => {}
// export const before         = (...args) : any => {}
// export const after          = (...args) : any => {}
//
// export const context        = (...args) : any => {}
// export const inputs         = (...args) : any => {}
// export const mutation       = (...args) : any => {}
// export const behavior       = (...args) : any => {}




// export function compute (fieldName) : MethodDecorator {
//
//     return function <T>(target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>) : TypedPropertyDescriptor<T> | void {
//         const method : Function   = descriptor.value as any
//
//         if (method.length > 0) throw new Error("Computed values should be pure")
//     }
// }

// export function inputs(value: { [s : string] : ChronoAtomReference }) {
//
//     return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
//     };
// }
//
//
//
// function inputs2(value: { [s : string] : ChronoAtomReference }) {
//
//     return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
//     };
// }
