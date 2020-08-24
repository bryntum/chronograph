import { MIN_SMI } from "./Helpers.js"

export interface Uniqable {
    uniqable        : number
}

/*
Why is it safe to use this approach for "uniqable"?

On my (decent) machine, this benchmark:

    const max = Number.MIN_SAFE_INTEGER + 1e10

    console.time('uniq')
    for (let i = Number.MIN_SAFE_INTEGER; i < MAX; i++) {}
    console.timeEnd('uniq');

runs in 22.8s

This gives us:
    (Number.MAX_SAFE_INTEGER - Number.MIN_SAFE_INTEGER) / 1e10 * 22.8 / 60 / 24 / 365 = 78 years

to exhaust the integers range.

Considering that this benchmarks exercise only integers exhausting and in real-world code
on every integer used, there will be at least 10x (in reality 1000x) of other instructions,
the real time for exhausting the interval is ~780 years

UPDATE: starting from 0 halves the exhausting time, but improves performance
(less bits to compare I guess)
 */
let UNIQABLE : number = MIN_SMI  // Number.MIN_SAFE_INTEGER

export const getUniqable = () => ++UNIQABLE


// in-place mutation
export const compact = <T extends Uniqable>(array : T[]) : T[] => {
    const uniqableId : number   = ++UNIQABLE

    let uniqueIndex : number    = 0

    for (let i = 0; i < array.length; ++i) {
        const element : T       = array[ i ]

        if (element.uniqable !== uniqableId) {
            element.uniqable    = uniqableId

            if (uniqueIndex !== i) array[ uniqueIndex ] = element

            ++uniqueIndex
        }
    }

    // assuming its better to not touch the array's `length` property
    // unless we really have to
    if (array.length !== uniqueIndex) array.length = uniqueIndex

    return array
}


// // in-place mutation + forEach
// export const compactAndForEach = (array : Uniqable[], func : (el : Uniqable) => any) => {
//     const uniqableId : number   = ++UNIQABLE
//
//     let uniqueIndex : number    = -1
//
//     for (let i = 0; i < array.length; ++i) {
//         const element : Uniqable    = array[ i ]
//
//         if (element.uniqable !== uniqableId) {
//             element.uniqable    = uniqableId
//
//             ++uniqueIndex
//
//             func(element)
//
//             if (uniqueIndex !== i) array[ uniqueIndex ] = element
//         }
//     }
//
//     // assuming its better to not touch the array's `length` property
//     // unless we really have to
//     if (array.length !== uniqueIndex + 1) array.length = uniqueIndex + 1
// }
