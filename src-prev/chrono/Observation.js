//---------------------------------------------------------------------------------------------------------------------
export const ObservableRead = (base) => {
    class ObservableRead extends base {
        get() {
            const res = super.get();
            this.observeRead(res);
            return res;
        }
    }
    return ObservableRead;
};
//---------------------------------------------------------------------------------------------------------------------
export const ObservableWrite = (base) => {
    class ObservableWrite extends base {
        set(value) {
            const res = super.set(value);
            this.observeWrite(value, res);
            return res;
        }
    }
    return ObservableWrite;
};
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
