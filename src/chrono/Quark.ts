import { AnyConstructor, Base, Mixin, MixinConstructor } from "../class/Mixin.js"
import { Box } from "../primitives/Box.js"
import { prototypeValue } from "../util/Helpers.js"
import { Identifier } from "./Identifier.js"


export interface Quark extends Box {
    identifier              : Identifier

    value                   : any
    proposedValue           : any

    usedProposedOrCurrent   : boolean
}


export const TombStone = Symbol('Tombstone')

// //---------------------------------------------------------------------------------------------------------------------
// export class TombstoneQuark extends MinimalQuark {
//
//     get value () {
//         throw new Error("Unknown identifier")
//     }
//
//
//     hasValue () : boolean {
//         return true
//     }
// }
