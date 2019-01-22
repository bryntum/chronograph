import {ChronoAtom, MinimalChronoAtom} from "../chrono/Atom.js";
import {Constructable, Mixin} from "../class/Mixin.js";
import {Entity as EntityData, Field as FieldData} from "../schema/Schema.js";
import {EntityAny} from "./Entity.js";


//---------------------------------------------------------------------------------------------------------------------
export const FieldAtom = <T extends Constructable<ChronoAtom>>(base : T) =>

class FieldAtom extends base {
    field       : FieldData

    self        : EntityAny

    commitValue () {
        super.commitValue()

        const continuationOfField = this.field.continuationOf

        if (continuationOfField) {
            // console.log(`Commit continued value to ${this.self.$[ continuationOfField.name ].id}, value: ${this.value}`)
            this.self.$[ continuationOfField.name ].value = this.value
        }
    }


    toString () : string {
        return `Field atom [${this.field.name}] of entity [${(this.self as any).id}]`
    }
}

export type FieldAtom = Mixin<typeof FieldAtom>


export class MinimalFieldAtom extends FieldAtom(MinimalChronoAtom) {}



//---------------------------------------------------------------------------------------------------------------------
export const EntityAtom = <T extends Constructable<ChronoAtom>>(base : T) =>

class EntityAtom extends base {
    entity      : EntityData

    self        : EntityAny


    toString () : string {
        return `Entity atom [${(this.self as any).id}]`
    }
}

export type EntityAtom = Mixin<typeof EntityAtom>


export class MinimalEntityAtom extends EntityAtom(MinimalChronoAtom) {}
