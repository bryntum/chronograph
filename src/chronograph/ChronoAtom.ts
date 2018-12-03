import {ChronoAtom, ChronoValue, Readable, Writable} from "../chrono/ChronoAtom.js";
import {Base, Constructable, Mixin} from "../class/Mixin.js";
import {ObservedBy} from "../graph/Node.js";


//---------------------------------------------------------------------------------------------------------------------
export type ComparatorFn<T> = (a : T, b : T) => number


//---------------------------------------------------------------------------------------------------------------------
export const Observable = <T extends Constructable<ChronoAtom & Readable & Writable & ObservedBy>>(base : T) => {

    abstract class Observable extends base {

        valuesComparator        : ComparatorFn<ChronoValue>


        set (value : ChronoValue) {

            if (this.valuesComparator(this.value, value) !== 0) {
                super.set(value)

                // push changes to observers

                // return this.runCalculation()
            }

            return this
        }
    }

    return Observable
}

export type Observable = Mixin<typeof Observable>


export const MinimalObservable = Observable(ObservedBy(Writable(Readable(ChronoAtom(Base)))))

export const UserInput = new MinimalObservable()


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
