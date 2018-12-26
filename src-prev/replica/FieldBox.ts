import {MinimalBox} from "../chronograph/Box.js";
import {Entity, Field} from "../schema/Schema.js";


//---------------------------------------------------------------------------------------------------------------------
export class FieldBox extends MinimalBox {
    field       : Field

    self        : any
}


//---------------------------------------------------------------------------------------------------------------------
export class EntityBox extends MinimalBox {
    entity      : Entity

    self        : any
}

