import {Atom, Readable, Writable} from "../chrono/Atom.js";
import {Constructable, Mixin} from "../class/Mixin.js";


//---------------------------------------------------------------------------------------------------------------------
export const Reference = <T extends Constructable<Readable & Writable & Atom>>(base: T) => {

    abstract class Reference extends base {
        value           : Atom


        isResolved () : boolean {
            return this.hasValue()
        }

        // should resolve the reference from whatever data it is represented with, and save the resolved atom to `this.value`
        resolve () {}
    }

    return Reference
}

export type Reference = Mixin<typeof Reference>
