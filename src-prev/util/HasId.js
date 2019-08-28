import { chronoId } from "./Id.js";
//---------------------------------------------------------------------------------------------------------------------
export const HasId = (base) => class HasId extends base {
    constructor() {
        super(...arguments);
        this.id = chronoId();
    }
};
