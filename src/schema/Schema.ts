import {Base} from "../class/Mixin.js";
import {ensureEntityOnPrototype} from "../replica/Entity.js";
import {Entity} from "./Entity.js";
import {Name} from "./Field.js";


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


    getEntityDecorator () : ClassDecorator {
        return (target : any) => {
            const name      = target.name
            if (!name) throw new Error(`Can't add entity - the target class has no name`)

            let entity      = ensureEntityOnPrototype(target.prototype)

            // entity possibly is already created by the field decorators, but in such case it should not have name
            if (entity.name && entity.name != name) throw new Error(`Invalid state`)

            entity.name     = name

            this.addEntity(entity)

            return target
        }
    }
}
