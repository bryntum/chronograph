/*

Reactivity glossary
===================

Observable
----------

Something that can be observed. A value. Event source. Something that "pushes" the data. A point.

Writeable
---------

An `<Observable>` which value can be supplied by "user".

Signal
------

A `<Writeable>` which pushes every value, supplied by "user".

Box
---

A `<Writeable>` which pushes only distinct values, supplied by "user", as per `equality` property.

Observer
--------

Something that observes an `Observable`. A function. Event receiver. Something that "pulls" the data. An arrow.


*/

import { AnyFunction } from "../../src/class/Mixin.js"

export interface Observable<V> {
    // effect-free reading
    readonly value : V

    push ()

    // tracking reading
    read () : V

    observedBy (observer : Observer)
}

export interface Writeable<V> extends Observable<V> {
    nextTick ()

    write (v : V)
}

export interface Signal<V> extends Writeable<V> {
}

export interface Box<V> extends Writeable<V> {
    readonly equality   : (v1 : V, v2 : V) => boolean
}

// export interface Callable<V extends unknown[]> extends Observable<V> {
//     call (...v : V)
// }



interface ObservationEffect {}

export interface Observer {
    readonly calculation : (...input : unknown[]) => unknown
}


/*

COPYRIGHT AND LICENSE
=================

MIT License

Copyright (c) 2018-2020 Bryntum, Nickolay Platonov
*/
