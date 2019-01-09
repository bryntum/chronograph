import {ChronoAtom, MinimalChronoAtom} from "../chrono/Atom.js";
import {Constructable, Mixin} from "../class/Mixin.js";
import {Entity as EntityData, Field as FieldData} from "../schema/Schema.js";
import {EntityAny} from "./Entity.js";


//---------------------------------------------------------------------------------------------------------------------
export const FieldAtom = <T extends Constructable<ChronoAtom>>(base : T) =>

class FieldAtom extends base {
    field       : FieldData

    self        : EntityAny
}

export type FieldAtom = Mixin<typeof FieldAtom>


export class MinimalFieldAtom extends FieldAtom(MinimalChronoAtom) {}



//---------------------------------------------------------------------------------------------------------------------
export const EntityAtom = <T extends Constructable<ChronoAtom>>(base : T) =>

class EntityAtom extends base {
    entity      : EntityData

    self        : EntityAny
}

export type EntityAtom = Mixin<typeof EntityAtom>


export class MinimalEntityAtom extends EntityAtom(MinimalChronoAtom) {}
