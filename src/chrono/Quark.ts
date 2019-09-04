import { AnyConstructor, Base, Mixin, MixinConstructor } from "../class/Mixin.js"
import { prototypeValue } from "../util/Helpers.js"
import { Identifier } from "./Identifier.js"


//---------------------------------------------------------------------------------------------------------------------
export const Quark = <T extends AnyConstructor<Base>>(base : T) => {

    class Quark extends base {
        identifier              : Identifier

        proposedValue           : any
        value                   : any

        @prototypeValue(false)
        usedProposed            : boolean


        hasValue () : boolean {
            return this.value !== undefined
        }
    }

    return Quark
}

export type Quark = Mixin<typeof Quark>

export interface QuarkI extends Quark {}


export type QuarkConstructor = MixinConstructor<typeof Quark>

export class MinimalQuark extends Quark(Base) {}


//---------------------------------------------------------------------------------------------------------------------
export class TombstoneQuark extends MinimalQuark {

    get value () {
        throw new Error("Can not read value from the tombstone quark")
    }


    hasValue () : boolean {
        return true
    }
}
