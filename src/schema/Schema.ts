import {Base} from "../class/Mixin.js";

export type Name    = string | symbol
export type Type    = string


//---------------------------------------------------------------------------------------------------------------------
export class Field extends Base {
    name                : Name

    type                : Type

    entity              : Entity
}


//---------------------------------------------------------------------------------------------------------------------
export class Entity extends Base {
    name                : Name

    fields              : Map<Name, Field>      = new Map()

    schema              : Schema

    primaryKeys         : PrimaryKey[]          = []
    foreignKeys         : ForeignKey[]          = []


    hasField (name : Name) : boolean {
        return this.fields.has(name)
    }


    getField (name : Name) : Field {
        return this.fields.get(name)
    }


    addField (field : Field) : Field {
        const name      = field.name

        if (!name) throw new Error(`Field must have a name`)
        if (this.hasField(name)) throw new Error(`Field with name [${String(name)}] already exists`)

        field.entity    = this

        this.fields.set(name, field)

        return field
    }


    createField (name : Name) : Field {
        return this.addField(Field.new({ name }))
    }


    addPrimaryKey (key : PrimaryKey) {
        key.entity      = this

        this.primaryKeys.push(key)
    }


    addForeignKey (key : ForeignKey) {
        key.entity      = this

        this.foreignKeys.push(key)
    }

}


//---------------------------------------------------------------------------------------------------------------------
export class Schema extends Base {
    name                : Name

    entities            : Map<Name, Entity>     = new Map()


    hasEntity (name : Name) : boolean {
        return this.entities.has(name)
    }


    getEntity (name : Name) : Entity {
        return this.entities.get(name)
    }


    addEntity (entity : Entity) : Entity {
        const name      = entity.name

        if (!name) throw new Error(`Entity must have a name`)
        if (this.hasEntity(name)) throw new Error(`Entity with name [${String(name)}] already exists`)

        entity.schema   = this

        this.entities.set(name, entity)

        return entity
    }


    createEntity (name : Name) : Entity {
        return this.addEntity(Entity.new({ name }))
    }


    getEntityDecorator () : ClassDecorator {
        return (target : any) => {
            if (!target.name) throw new Error(`Can't add entity - the target class has no name`)

            let entity      = target.prototype.$entity

            if (!entity) entity = target.prototype.$entity = Entity.new()

            entity.name     = target.name

            this.addEntity(entity)

            return target
        }
    }


    getFieldDecorator () : PropertyDecorator {
        return function (target : any, propertyKey : string | symbol) : void {
            let entity      = target.$entity

            if (!entity) entity = target.$entity = Entity.new()

            entity.createField(propertyKey)
        }
    }
}



//---------------------------------------------------------------------------------------------------------------------
export class FieldSet extends Base {
    entity                  : Entity

    fieldSet                : Field[]   = []
}


//---------------------------------------------------------------------------------------------------------------------
export class PrimaryKey extends FieldSet {
}


//---------------------------------------------------------------------------------------------------------------------
export class ForeignKey extends FieldSet {
    referencedFieldSet      : Field[]   = []

    referencedEntity        : Entity
}


// function id<V> (v : V) { return v }
//
// const some : Date = id<Date>(new Date())
//
// type IdDate         = typeof id<Date> // TS1005: ';' expected
//
// const dateId        = id<Date> // TS1109: Expression expected.



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
