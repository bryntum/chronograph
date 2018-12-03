import {Base, Constructable, Mixin} from "../class/Mixin.js";
import {Node, ObservedBy} from "../graph/Node.js";
import {chronoId, ChronoId} from "./ChronoId.js";


//---------------------------------------------------------------------------------------------------------------------
/*
    TODO BIG THING POTENTIALLY
    ==========================

    figure out how to specialize the "ChronoAtom" type with type of value argument

        class ChronoAtom<V> extends base {
            protected value     : V
        }

    will require the specialization in all downstream mixins + universal wrapper for the graph node,
    but will introduce much more type-safety
*/

export type ChronoValue         = unknown

export const Atom = <T extends Constructable<Base>>(base : T) =>

class Atom extends base {
    value               : ChronoValue


    hasValue () : boolean {
        return this.hasOwnProperty('value')
    }
}

export type Atom = Mixin<typeof Atom>


//---------------------------------------------------------------------------------------------------------------------
export const Readable = <T extends Constructable<Atom>>(base : T) =>

class Readable extends base {
    get ()              : ChronoValue {
        return this.value
    }
}

export type Readable = Mixin<typeof Readable>



//---------------------------------------------------------------------------------------------------------------------
export const Writable = <T extends Constructable<Atom>>(base : T) =>

class Writable extends base {
    set (value : ChronoValue) : void {
        this.value  = value
    }
}

export type Writable = Mixin<typeof Writable>


//---------------------------------------------------------------------------------------------------------------------
/*
    Calculable<V> ?

    This is probably an abstract version of "can grow graph" "effect",
    (which implements it as "propagateChanges")
    but using it everywhere instead for now
*/
export const Calculable = <T extends Constructable<Base>>(base : T) => {

    abstract class Calculable extends base {
        abstract runCalculation ()
    }

    return Calculable
}

export type Calculable = Mixin<typeof Calculable>




export const MinimalRWAtom = Writable(Readable(Atom(Base)))
