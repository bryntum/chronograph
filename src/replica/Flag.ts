import {ChronoValue} from "../chrono/Atom.js";
import {Constructable, Mixin} from "../class/Mixin.js";
import {FieldAtom, MinimalFieldAtom} from "./Atom.js";


//---------------------------------------------------------------------------------------------------------------------
export const FlagAtom = <T extends Constructable<FieldAtom>>(base : T) =>

class FlagAtom extends base {

    defaultValue        : ChronoValue


    initialize () {
        super.initialize(...arguments)

        this.defaultValue       = this.value
    }

    commit () {
        super.commit()

        this.put(this.defaultValue)
    }

    reject () {
        super.reject()

        this.put(this.defaultValue)
    }
}

export type FlagAtom = Mixin<typeof FlagAtom>

export class MinimalFlagAtom extends FlagAtom(MinimalFieldAtom) {}
