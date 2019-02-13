import {ChronoAtom, MinimalChronoAtom} from "../chrono/Atom.js";
import {AnyConstructor, Mixin} from "../class/Mixin.js";
import {Entity as EntityData} from "../schema/Entity.js";
import {Field as FieldData} from "../schema/Field.js";
import {Entity} from "./Entity.js";


//---------------------------------------------------------------------------------------------------------------------
export const FieldAtom = <T extends AnyConstructor<ChronoAtom>>(base : T) =>

class FieldAtom extends base {
    field       : FieldData

    self        : Entity

    commitValue () {
        super.commitValue()

        const continuationOfField = this.field.continuationOf

        if (continuationOfField) {
            this.self.$[ continuationOfField.name ].value = this.value
        }
    }


    toString () : string {
        return `Field atom [${this.field.name}] of entity [${(this.self as any).id}]`
    }
}

export type FieldAtom = Mixin<typeof FieldAtom>
export interface FieldAtomI extends Mixin<typeof FieldAtom> {}


export class MinimalFieldAtom extends FieldAtom(MinimalChronoAtom) {}



//---------------------------------------------------------------------------------------------------------------------
export const EntityAtom = <T extends AnyConstructor<ChronoAtom>>(base : T) =>

class EntityAtom extends base {
    entity      : EntityData

    self        : Entity


    toString () : string {
        return `Entity atom [${(this.self as any).id}]`
    }
}

export type EntityAtom = Mixin<typeof EntityAtom>
export interface EntityAtomI extends Mixin<typeof EntityAtom> {}


export class MinimalEntityAtom extends EntityAtom(MinimalChronoAtom) {}
