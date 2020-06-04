import { Uniqable } from "../../util/Uniqable.js"
import { CalculationMode } from "../CalculationMode.js"
import { ChronoId } from "../Id.js"
import { Meta } from "../Meta.js"

//---------------------------------------------------------------------------------------------------------------------
export interface GarbageCollectable {
    refCount    : number

    destroy ()
}


//---------------------------------------------------------------------------------------------------------------------
export interface Identifiable {
    id          : ChronoId
}


//---------------------------------------------------------------------------------------------------------------------
export interface Immutable {
    owner       : Owner<this>

    previous    : this | undefined

    freeze ()

    createNext () : this
}


//---------------------------------------------------------------------------------------------------------------------
// export interface Observable {
//     observers       : Observer
// }
//
//
// export interface Observer {
//     // addObservation (observable : Observable)
//
//     onObservable
// }


//---------------------------------------------------------------------------------------------------------------------
export interface Owner<I extends Immutable> {
    immutable   : I

    setCurrent (immutable : I)
}


// //---------------------------------------------------------------------------------------------------------------------
// export interface AtomWithValue<V> extends IoRef {
//     read () : V
// }

export interface Atom extends Uniqable {
    isStale () : boolean
    hasValue () : boolean

    onBecomeStale ()

    addIncoming (atom : Atom, calledFromPartner : boolean)
    addOutgoing (atom : Atom, calledFromPartner : boolean)

    getIncoming () : Atom[]
    getOutgoing () : Atom[]

    calculate ()
}


export interface OwnerManaged<I extends Immutable> extends Owner<I> {
    meta        : Meta<unknown, CalculationMode>
}
