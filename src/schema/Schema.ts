import {ChronoAtom, Observable, Readable, Writable} from "../chrono/ChronoAtom.js";
import {ChronoGraphLayer, ChronoGraphNode, GenericChronoGraphNode} from "../chrono/ChronoGraph.js";
import {Base, Constructable} from "../util/Mixin.js";
import {ChronoObject} from "./Object.js";


export type Name    = string | Symbol
export type Type    = string


//-----------------------------------------------------------------------------
export class Field extends Base {
    name                : Name
    type                : Type


    generateNodes (self : ChronoObject, cls : typeof GenericChronoGraphNode)  {
        return cls.new()
    }
}


export type ChronoGraphFieldsNamedCollection = { [s in keyof any] : ChronoGraphNode }


//-----------------------------------------------------------------------------
export class Entity extends Base {
    name                : Name

    fields              : Map<Name, Field>      = new Map()


    field (name : Name) : Field {
        return this.fields.get(name)
    }


    generateNodes (self : ChronoObject, cls : typeof GenericChronoGraphNode) : ChronoGraphFieldsNamedCollection {
        let res     = {}

        this.fields.forEach((field, name : string) => res[ name ] = field.generateNodes(self, cls))

        return res
    }
}


//-----------------------------------------------------------------------------
export class Schema extends Base {
    name                : Name

    entities            : Map<Name, Entity>     = new Map()


    entity (name : Name) : Entity {
        return this.entities.get(name)
    }


    entityDecorator (name : Name) {
        return () => {

        }
    }
}



export const atom           = (...args) : any => {}
export const field          = (...args) : any => {}
export const entity         = (...args) : any => {}
export const as             = (...args) : any => {}
export const lifecycle      = (...args) : any => {}
export const before         = (...args) : any => {}
export const after          = (...args) : any => {}

export const context        = (...args) : any => {}
export const inputs         = (...args) : any => {}
export const mutation       = (...args) : any => {}
export const behavior       = (...args) : any => {}




export function compute (fieldName) : MethodDecorator {

    return function <T>(target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>) : TypedPropertyDescriptor<T> | void {
        const method : Function   = descriptor.value as any

        if (method.length > 0) throw new Error("Computed values should be pure")
    }
}

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
