import { MinimalQuark, Quark } from "../chrono/Quark.js"
import { AnyConstructor, Mixin } from "../class/Mixin.js"
import { Entity as EntityData } from "../schema/Entity.js"
import { Field as FieldData } from "../schema/Field.js"
import { Entity } from "./Entity.js"


export interface PartOfEntityQuark {
    self        : Entity
}


//---------------------------------------------------------------------------------------------------------------------
export const FieldQuark = <T extends AnyConstructor<Quark>>(base : T) =>

class FieldQuark extends base implements PartOfEntityQuark {
    field       : FieldData

    self        : Entity


    // put (proposedValue : ChronoValue, ...args) {
    //     return super.put(this.field.converter ? this.field.converter(proposedValue, this.field) : proposedValue, ...args)
    // }


    toString () : string {
        return `Field atom [${ this.field.name }] of entity [${ this.self }}]`
    }
}

export type FieldQuark = Mixin<typeof FieldQuark>


// export class MinimalFieldQuark extends FieldQuark(MinimalChronoAtom) {}



//---------------------------------------------------------------------------------------------------------------------
export const EntityQuark = <T extends AnyConstructor<Quark>>(base : T) =>

class EntityQuark extends base implements PartOfEntityQuark {
    entity      : EntityData

    self        : Entity


    toString () : string {
        return `Entity atom [${(this.self as any).id}]`
    }
}

export type EntityQuark = Mixin<typeof EntityQuark>
export interface EntityQuarkI extends Mixin<typeof EntityQuark> {}


export class MinimalEntityQuark extends EntityQuark(MinimalQuark) {}
