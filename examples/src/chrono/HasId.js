import { chronoId } from "../chrono/Id.js";
//---------------------------------------------------------------------------------------------------------------------
export const HasId = (base) => class HasId extends base {
    constructor() {
        super(...arguments);
        this.id = chronoId();
    }
};
