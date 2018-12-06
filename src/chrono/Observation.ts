import {AnyFunction, Base, Constructable, Mixin} from "../class/Mixin.js";
import {Atom, ChronoValue, Readable} from "./Atom.js";


//---------------------------------------------------------------------------------------------------------------------
export const TraceableRead = <T extends Constructable<Atom & Readable>>(base : T) => {

    abstract class TraceableRead extends base {
        get ()              : ChronoValue {
            const res       = super.get()

            this.traceRead(res)

            return res
        }

        abstract traceRead (value : ChronoValue)
    }

    return TraceableRead
}

export type TraceableRead = Mixin<typeof TraceableRead>






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
