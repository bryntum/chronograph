import {Base, Constructable, Mixin} from "../util/Mixin.js";
import {chronoId, ChronoId, namespacedId} from "./ChronoId.js";



//-----------------------------------------------------------------------------
export type ChronoValue         = any


// export type ChronoGraphLayer    = number

//-----------------------------------------------------------------------------
export const ChronoAtom = <T extends Constructable<Base>>(base : T) => {

    abstract class ChronoAtom extends base {
        id                  : ChronoId = chronoId()

        protected value     : ChronoValue
    }

    return ChronoAtom
}

export type ChronoAtom = Mixin<typeof ChronoAtom>



//-----------------------------------------------------------------------------
export const Readable = <T extends Constructable<ChronoAtom>>(base : T) => {

    abstract class Readable extends base {
        get ()              : ChronoValue {
            return this.value
        }
    }

    return Readable
}

export type Readable = Mixin<typeof Readable>


//-----------------------------------------------------------------------------
export const TraceableRead = <T extends Constructable<ChronoAtom & Readable>>(base : T) => {

    abstract class TraceableRead extends base {
        get ()              : ChronoValue {
            this.traceRead()

            return this.value
        }

        abstract traceRead ()
    }

    return TraceableRead
}

export type TraceableRead = Mixin<typeof TraceableRead>



//-----------------------------------------------------------------------------
export type ComparatorFn<T> = (a : T, b : T) => number


//-----------------------------------------------------------------------------
export const Writable = <T extends Constructable<ChronoAtom>>(base : T) => {

    abstract class Writable extends base {

        valuesComparator        : ComparatorFn<ChronoValue>


        set (value : ChronoValue) : this {

            if (this.valuesComparator(this.value, value) !== 0) {

                this.value  = value

                this.publishChange()
            }

            return this
        }

        abstract publishChange ()
    }

    return Writable
}

export type Writable = Mixin<typeof Writable>
