import {MinimalChronoAtom} from "../chrono/Atom.js";
import {Field as FieldData, Entity as EntityData} from "../schema/Schema.js";
import {Entity} from "./Entity.js";


//---------------------------------------------------------------------------------------------------------------------
export class FieldAtom extends MinimalChronoAtom {
    field       : FieldData

    self        : Entity
}


//---------------------------------------------------------------------------------------------------------------------
export class EntityAtom extends MinimalChronoAtom {
    entity      : EntityData

    self        : Entity
}

