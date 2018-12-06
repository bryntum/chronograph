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
export const Calculable = <T extends Constructable<Base>>(base : T) => {

    abstract class Calculable extends base {
        abstract calculate ()
    }

    return Calculable
}

export type Calculable = Mixin<typeof Calculable>



//---------------------------------------------------------------------------------------------------------------------
export const MinimalRWAtom = Writable(Readable(Atom(Base)))


// // //---------------------------------------------------------------------------------------------------------------------
// // export const TraceableRead = <T extends Constructable<ChronoAtom & Readable>>(base : T) => {
// //
// //     abstract class TraceableRead extends base {
// //         get ()              : ChronoValue {
// //             this.traceRead()
// //
// //             return super.get()
// //         }
// //
// //         abstract traceRead ()
// //     }
// //
// //     return TraceableRead
// // }
// //
// // export type TraceableRead = Mixin<typeof TraceableRead>
//
//
//


//
// //---------------------------------------------------------------------------------------------------------------------
// export type ComparatorFn<T> = (a : T, b : T) => number
//
//
// //---------------------------------------------------------------------------------------------------------------------
// export const Observable = <T extends Constructable<Atom & Readable & Writable & ObservedBy>>(base : T) => {
//
//     abstract class Observable extends base {
//
//         comparator        : ComparatorFn<ChronoValue>
//
//
//         set (value : ChronoValue) {
//
//             if (this.comparator(this.value, value) !== 0) {
//                 super.set(value)
//
//                 // push changes to observers
//
//                 // return this.calculate()
//             }
//
//             return this
//         }
//     }
//
//     return Observable
// }
//
// export type Observable = Mixin<typeof Observable>
//
//
// export const MinimalObservable = Observable(ObservedBy(Writable(Readable(Atom(Base)))))
//
// export const UserInput = new MinimalObservable()
//
//
