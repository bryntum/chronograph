import { Base } from "../class/BetterMixin.js";
//---------------------------------------------------------------------------------------------------------------------
/**
 * This class describes an entity. Entity is simply a collection of [[Field]]s. Entity also may have a parent entity,
 * from which it inherit the fields.
 */
export class EntityMeta extends Base {
    constructor() {
        super(...arguments);
        this.ownFields = new Map();
        this.$skeleton = {};
        this._allFields = undefined;
    }
    /**
     * Checks whether the entity has a field with given name (possibly inherited from parent entity).
     *
     * @param name
     */
    hasField(name) {
        return this.getField(name) !== undefined;
    }
    /**
     * Returns a field with given name (possibly inherited) or `undefined` if there's none.
     *
     * @param name
     */
    getField(name) {
        return this.allFields.get(name);
    }
    /**
     * Adds a field to this entity.
     *
     * @param field
     */
    addField(field) {
        const name = field.name;
        if (!name)
            throw new Error(`Field must have a name`);
        if (this.ownFields.has(name))
            throw new Error(`Field with name [${name}] already exists`);
        field.entity = this;
        this.ownFields.set(name, field);
        return field;
    }
    forEachParent(func) {
        let entity = this;
        while (entity) {
            func(entity);
            entity = entity.parentEntity;
        }
    }
    get allFields() {
        if (this._allFields !== undefined)
            return this._allFields;
        const allFields = new Map();
        const visited = new Set();
        this.forEachParent(entity => {
            entity.ownFields.forEach((field, name) => {
                if (!visited.has(name)) {
                    visited.add(name);
                    allFields.set(name, field);
                }
            });
        });
        return this._allFields = allFields;
    }
    /**
     * Iterator for all fields of this entity (including inherited).
     *
     * @param func
     */
    forEachField(func) {
        this.allFields.forEach(func);
    }
}
