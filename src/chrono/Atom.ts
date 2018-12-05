import {Base, Constructable, Mixin} from "../class/Mixin.js";


//---------------------------------------------------------------------------------------------------------------------
/*
    TODO
    ====

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
    set (value : ChronoValue) : this {
        this.value  = value

        return this
    }
}

export type Writable = Mixin<typeof Writable>


//---------------------------------------------------------------------------------------------------------------------
export const Immutable = <T extends Constructable<Writable>>(base : T) =>

class Immutable extends base {
    set (value : ChronoValue) : this {
        if (this.hasValue()) throw new Error("Can't mutate value")

        return super.set(value)
    }
}

export type Immutable = Mixin<typeof Immutable>



//---------------------------------------------------------------------------------------------------------------------
export const Calculable = <T extends Constructable<Base>>(base : T) => {

    abstract class Calculable extends base {
        abstract calculate ()
    }

    return Calculable
}

export type Calculable = Mixin<typeof Calculable>



//---------------------------------------------------------------------------------------------------------------------
export const MinimalRWAtom = Writable(Readable(Atom(Base)))
