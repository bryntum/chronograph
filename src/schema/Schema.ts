import { Base } from "../class/Base.js"
import { ensureEntityOnPrototype, EntityConstructor } from "../replica/Entity.js"
import { EntityMeta } from "./EntityMeta.js"
import { Name } from "./Field.js"


//---------------------------------------------------------------------------------------------------------------------
/**
 * This class describes a schema. Schemas are not used yet in ChronoGraph.
 *
 * Schema is just a collection of entities ([[EntityMeta]])
 */
export class Schema extends Base {
    /**
     * The name of the schema
     */
    name                : Name

    entities            : Map<Name, EntityMeta>     = new Map()

    /**
     * Checks whether the schema has an entity with the given name.
     *
     * @param name
     */
    hasEntity (name : Name) : boolean {
        return this.entities.has(name)
    }


    /**
     * Returns an entity with the given name or `undefined` if there's no such in this schema
     *
     * @param name
     */
    getEntity (name : Name) : EntityMeta {
        return this.entities.get(name)
    }


    /**
     * Adds an entity to the schema.
     * @param entity
     */
    addEntity (entity : EntityMeta) : EntityMeta {
        const name      = entity.name

        if (!name) throw new Error(`Entity must have a name`)
        if (this.hasEntity(name)) throw new Error(`Entity with name [${String(name)}] already exists`)

        entity.schema   = this

        this.entities.set(name, entity)

        return entity
    }


    /**
     * Returns a class decorator which can be used to decorate classes as entities.
     */
    getEntityDecorator () : ClassDecorator {
        // @ts-ignore : https://github.com/Microsoft/TypeScript/issues/29828
        return (target : EntityConstructor) => {
            const entity = entityDecoratorBody(target)

            this.addEntity(entity)

            return target
        }
    }
}


export const entityDecoratorBody = <T extends EntityConstructor>(target : T) => {
    const name      = target.name
    if (!name) throw new Error(`Can't add entity - the target class has no name`)

    let entity      = ensureEntityOnPrototype(target.prototype)

    // entity possibly is already created by the field decorators, but in such case it should not have name
    if (entity.name && entity.name != name) throw new Error(`Invalid state`)

    entity.name     = name

    return entity
}


export const entity = <T extends EntityConstructor>(target : T) : T => {
    entityDecoratorBody(target)

    return target
}
