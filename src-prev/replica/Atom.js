import { MinimalChronoAtom } from "../chrono/Atom.js";
//---------------------------------------------------------------------------------------------------------------------
export const FieldAtom = (base) => class FieldAtom extends base {
    put(proposedValue, ...args) {
        return super.put(this.field.converter ? this.field.converter(proposedValue, this.field) : proposedValue, ...args);
    }
    toString() {
        return `Field atom [${this.field.name}] of entity [${this.self}}]`;
    }
};
export class MinimalFieldAtom extends FieldAtom(MinimalChronoAtom) {
}
//---------------------------------------------------------------------------------------------------------------------
export const EntityAtom = (base) => class EntityAtom extends base {
    toString() {
        return `Entity atom [${this.self.id}]`;
    }
};
export class MinimalEntityAtom extends EntityAtom(MinimalChronoAtom) {
}
