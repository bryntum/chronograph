import {Base, Constructable, Mixin} from "../class/Mixin.js";


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

export const ChronoAtom = <T extends Constructable<Base>>(base : T) =>

class ChronoAtom extends base {
    protected value     : ChronoValue
}

export type ChronoAtom = Mixin<typeof ChronoAtom>


//---------------------------------------------------------------------------------------------------------------------
export const Readable = <T extends Constructable<ChronoAtom>>(base : T) =>

class Readable extends base {
    get ()              : ChronoValue {
        return this.value
    }
}

export type Readable = Mixin<typeof Readable>


//---------------------------------------------------------------------------------------------------------------------
export const Writable = <T extends Constructable<ChronoAtom>>(base : T) =>

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



//---------------------------------------------------------------------------------------------------------------------
export type ComparatorFn<T> = (a : T, b : T) => number


//---------------------------------------------------------------------------------------------------------------------
export const Observable = <T extends Constructable<ChronoAtom & Readable & Writable & Calculable>>(base : T) => {

    abstract class Observable extends base {

        valuesComparator        : ComparatorFn<ChronoValue>


        set (value : ChronoValue) {

            if (this.valuesComparator(this.value, value) !== 0) {
                super.set(value)

                return this.runCalculation()
            }

            return this
        }
    }

    return Observable
}

export type Observable = Mixin<typeof Observable>




// //---------------------------------------------------------------------------------------------------------------------
// export const TraceableRead = <T extends Constructable<ChronoAtom & Readable>>(base : T) => {
//
//     abstract class TraceableRead extends base {
//         get ()              : ChronoValue {
//             this.traceRead()
//
//             return super.get()
//         }
//
//         abstract traceRead ()
//     }
//
//     return TraceableRead
// }
//
// export type TraceableRead = Mixin<typeof TraceableRead>
