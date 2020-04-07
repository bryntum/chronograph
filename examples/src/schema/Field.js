import { Meta } from "../chrono/Identifier.js";
import { MinimalFieldIdentifierGen, MinimalFieldIdentifierSync, MinimalFieldVariable } from "../replica/Identifier.js";
//---------------------------------------------------------------------------------------------------------------------
/**
 * This class describes a field of some [[EntityMeta]].
 */
export class Field extends Meta {
    constructor() {
        super(...arguments);
        /**
         * Boolean flag, indicating whether this field should be persisted
         */
        this.persistent = true;
    }
    getIdentifierClass(calculationFunction) {
        if (this.identifierCls)
            return this.identifierCls;
        if (!calculationFunction)
            return MinimalFieldVariable;
        return calculationFunction.constructor.name === 'GeneratorFunction' ? MinimalFieldIdentifierGen : MinimalFieldIdentifierSync;
    }
}
