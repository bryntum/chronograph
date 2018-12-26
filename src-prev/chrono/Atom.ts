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

export type ChronoValue         = any

export const Atom = <T extends Constructable<Base>>(base : T) =>

class Atom extends base {
    value               : ChronoValue


    hasValue () : boolean {
        return this.hasOwnProperty('value')
    }
}

export type Atom = Mixin<typeof Atom>


// //---------------------------------------------------------------------------------------------------------------------
// export const DelegatedStorage = <T extends Constructable<Readable & Writable>>(base : T) =>
//
// class DelegatedStorage extends base {
//     host            : any
//
//     propertyName    : string | symbol
//
//
//     get () : ChronoValue {
//         return this.host[ this.propertyName ]
//     }
//
//
//     set (value : ChronoValue) : this {
//         this.host[ this.propertyName ]  = value
//
//         return this
//     }
//
//
//     hasValue () : boolean {
//         return this.host.hasOwnProperty(this.propertyName)
//     }
// }
//
// export type DelegatedStorage = Mixin<typeof DelegatedStorage>



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
export const Calculable = <T extends Constructable<Base>>(base : T) => {

    abstract class Calculable extends base {
        abstract calculate ()
    }

    return Calculable
}

export type Calculable = Mixin<typeof Calculable>



//---------------------------------------------------------------------------------------------------------------------
export const MinimalRWAtom = Writable(Readable(Atom(Base)))
