import { Base } from "../class/Mixin.js";
export const IteratorReturnedEarly = Symbol("IteratorReturnedEarly");
//---------------------------------------------------------------------------------------------------------------------
export class Entity extends Base {
    constructor() {
        super(...arguments);
        this.fields = new Map();
    }
    hasField(name) {
        return this.getField(name) !== undefined;
    }
    getField(name) {
        let result = undefined;
        this.forEachParent(entity => {
            const field = entity.fields.get(name);
            if (field) {
                result = field;
                return IteratorReturnedEarly;
            }
        });
        return result;
    }
    addField(field) {
        const name = field.name;
        if (!name)
            throw new Error(`Field must have a name`);
        if (this.fields.has(name))
            throw new Error(`Field with name [${String(name)}] already exists`);
        field.entity = this;
        this.fields.set(name, field);
        return field;
    }
    forEachParent(func) {
        let entity = this;
        while (entity) {
            if (func(entity) === IteratorReturnedEarly)
                return IteratorReturnedEarly;
            entity = entity.parentEntity;
        }
    }
    forEachField(func) {
        const visited = new Set();
        this.forEachParent(entity => {
            entity.fields.forEach((field, name) => {
                if (!visited.has(name)) {
                    visited.add(name);
                    func(field, name);
                }
            });
        });
    }
}
