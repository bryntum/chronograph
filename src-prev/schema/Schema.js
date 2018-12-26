import { Base } from "../class/Mixin.js";
//---------------------------------------------------------------------------------------------------------------------
export class Field extends Base {
}
//---------------------------------------------------------------------------------------------------------------------
export class Entity extends Base {
    constructor() {
        super(...arguments);
        this.fields = new Map();
        this.primaryKeys = [];
        this.foreignKeys = [];
    }
    hasField(name) {
        return this.fields.has(name);
    }
    getField(name) {
        return this.fields.get(name);
    }
    addField(field) {
        const name = field.name;
        if (!name)
            throw new Error(`Field must have a name`);
        if (this.hasField(name))
            throw new Error(`Field with name [${String(name)}] already exists`);
        field.entity = this;
        this.fields.set(name, field);
        return field;
    }
    createField(name) {
        return this.addField(Field.new({ name }));
    }
    addPrimaryKey(key) {
        key.entity = this;
        this.primaryKeys.push(key);
    }
    addForeignKey(key) {
        key.entity = this;
        this.foreignKeys.push(key);
    }
}
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
    createEntity(name) {
        return this.addEntity(Entity.new({ name }));
    }
    getEntityDecorator() {
        return (target) => {
            if (!target.name)
                throw new Error(`Can't add entity - the target class has no name`);
            let entity = target.prototype.$entity;
            if (!entity)
                entity = target.prototype.$entity = Entity.new();
            entity.name = target.name;
            this.addEntity(entity);
            return target;
        };
    }
}
//---------------------------------------------------------------------------------------------------------------------
export class FieldSet extends Base {
    constructor() {
        super(...arguments);
        this.fieldSet = [];
    }
}
//---------------------------------------------------------------------------------------------------------------------
export class PrimaryKey extends FieldSet {
}
//---------------------------------------------------------------------------------------------------------------------
export class ForeignKey extends FieldSet {
    constructor() {
        super(...arguments);
        this.referencedFieldSet = [];
    }
}
