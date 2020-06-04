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


// //---------------------------------------------------------------------------------------------------------------------
// export interface QuarkWithValue<V> extends Immutable {
//     read () : V
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

export interface Atom extends Owner<Immutable> {

}


export interface OwnerManaged<I extends Immutable> extends Owner<I> {
    meta        : Meta<unknown, CalculationMode>
}
