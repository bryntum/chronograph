import {Base, Constructable, Mixin} from "../util/Mixin.js";
import {ChronoGraphNode} from "./ChronoGraph.js";
import {Entity, Name} from "../schema/Schema.js";

export const ChronoEntity =

<T extends Constructable<Base>>(base : T) =>

class ChronoEntity extends base {
    meta            : Entity

    fields          : Map<Name, ChronoGraphNode> = new Map()
}

export type ChronoEntity = Mixin<typeof ChronoEntity>


// const Ev = ChronoEntity(Base).new().


// //
// //
// // export type FieldName = string
// //
// //
// // export class ChronoField<ChronoEntity> extends ChronoAtom {
// //     name                : FieldName
// //
// // }
// //
// //
// // export class ChronoEntityMeta extends Base {
// //     fields              : Map<FieldName, ChronoField<this>> = new Map()
// //
// //     fieldsDecorator     :
// // }
