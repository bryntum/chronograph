import {AnyFunction, Base} from "../class/Mixin.js";
import {MinimalFieldAtom} from "../replica/Atom.js";
import {MinimalFlagAtom} from "../replica/Flag.js";
import {MinimalReferenceAtom, MinimalReferenceStorageAccumulator} from "../replica/Reference.js";

export type Name    = string
export type Type    = string


//---------------------------------------------------------------------------------------------------------------------
export class Field extends Base {
    name                : Name

    type                : Type

    entity              : Entity

    persistent          : boolean   = true

    atomCls                 : typeof MinimalFieldAtom   = MinimalFieldAtom
    atomSetterPropagation   : AnyFunction
}


//---------------------------------------------------------------------------------------------------------------------
export class ReferenceField extends Field {
    atomCls             : typeof MinimalFieldAtom   = MinimalReferenceAtom

    storageKey          : Name
}


//---------------------------------------------------------------------------------------------------------------------
export class FlagField extends Field {
    atomCls             : typeof MinimalFlagAtom    = MinimalFlagAtom
}


//---------------------------------------------------------------------------------------------------------------------
export class ReferenceStorageField extends Field {
    persistent          : boolean   = false

    atomCls             : typeof MinimalReferenceStorageAccumulator = MinimalReferenceStorageAccumulator
}


//---------------------------------------------------------------------------------------------------------------------
export class Entity extends Base {
    name                : Name

    fields              : Map<Name, Field>      = new Map()

    schema              : Schema

    // primaryKeys         : PrimaryKey[]          = []
    // foreignKeys         : ForeignKey[]          = []


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


    createField (name : Name) : Field {
        return this.addField(Field.new({ name }))
    }


    // addPrimaryKey (key : PrimaryKey) {
    //     key.entity      = this
    //
    //     this.primaryKeys.push(key)
    // }
    //
    //
    // addForeignKey (key : ForeignKey) {
    //     key.entity      = this
    //
    //     this.foreignKeys.push(key)
    // }

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
}


// //---------------------------------------------------------------------------------------------------------------------
// export class Reference extends Base {
//     entity                  : Entity
//
//     fieldSet                : Field[]   = []
// }
//
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export class FieldSet extends Base {
//     entity                  : Entity
//
//     fieldSet                : Field[]   = []
// }
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export class PrimaryKey extends FieldSet {
// }
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export class ForeignKey extends FieldSet {
//     referenceName           : string
//
//     referencedFieldSet      : Field[]   = []
//
//     referencedEntity        : Entity
// }
