import { ChronoId } from "../Id.js"

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
