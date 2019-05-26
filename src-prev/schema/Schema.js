import { Base } from "../class/Mixin.js";
import { ensureEntityOnPrototype } from "../replica/Entity.js";
//---------------------------------------------------------------------------------------------------------------------
export class Schema extends Base {
    constructor() {
        super(...arguments);
        this.entities = new Map();
    }
    hasEntity(name) {
        return this.entities.has(name);
    }
    getEntity(name) {
        return this.entities.get(name);
    }
    addEntity(entity) {
        const name = entity.name;
        if (!name)
            throw new Error(`Entity must have a name`);
        if (this.hasEntity(name))
            throw new Error(`Entity with name [${String(name)}] already exists`);
        entity.schema = this;
        this.entities.set(name, entity);
        return entity;
    }
    getEntityDecorator() {
        // @ts-ignore : https://github.com/Microsoft/TypeScript/issues/29828
        return (target) => {
            const name = target.name;
            if (!name)
                throw new Error(`Can't add entity - the target class has no name`);
            let entity = ensureEntityOnPrototype(target.prototype);
            // entity possibly is already created by the field decorators, but in such case it should not have name
            if (entity.name && entity.name != name)
                throw new Error(`Invalid state`);
            entity.name = name;
            this.addEntity(entity);
            return target;
        };
    }
}
