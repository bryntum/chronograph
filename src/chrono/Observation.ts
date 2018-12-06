import {Constructable, Mixin} from "../class/Mixin.js";
import {Atom, ChronoValue, Readable, Writable} from "./Atom.js";


//---------------------------------------------------------------------------------------------------------------------
export const ObservableRead = <T extends Constructable<Atom & Readable>>(base : T) => {

    abstract class ObservableRead extends base {
        get ()              : ChronoValue {
            const res       = super.get()

            this.observeRead(res)

            return res
        }

        abstract observeRead (value : ChronoValue)
    }

    return ObservableRead
}

export type ObservableRead = Mixin<typeof ObservableRead>




//---------------------------------------------------------------------------------------------------------------------
export const ObservableWrite = <T extends Constructable<Atom & Writable>>(base : T) => {

    abstract class ObservableWrite extends base {
        set (value) : this {
            const res       = super.set(value)

            this.observeWrite(res)

            return res
        }

        abstract observeWrite (value : ChronoValue)
    }

    return ObservableWrite
}

export type ObservableWrite = Mixin<typeof ObservableWrite>





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
