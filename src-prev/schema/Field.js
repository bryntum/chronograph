import { Base } from "../class/Mixin.js";
import { MinimalFieldAtom } from "../replica/Atom.js";
//---------------------------------------------------------------------------------------------------------------------
export class Field extends Base {
    constructor() {
        super(...arguments);
        this.persistent = true;
        this.createAccessors = true;
        this.atomCls = MinimalFieldAtom;
    }
}
