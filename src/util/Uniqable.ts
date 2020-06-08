import { MIN_SMI } from "./Helpers.js"

export interface Uniqable {
    uniqable        : number
}


let UNIQABLE : number = MIN_SMI


// in-place mutation
export const compact = <T extends Uniqable>(array : T[]) : T[] => {
    const uniqableId : number   = ++UNIQABLE

    let uniqueIndex : number    = -1

    for (let i = 0; i < array.length; ++i) {
        const element : T       = array[ i ]

        if (element.uniqable !== uniqableId) {
            element.uniqable    = uniqableId

            ++uniqueIndex

            if (uniqueIndex !== i) array[ uniqueIndex ] = element
        }
    }

    // assuming its better to not touch the array's `length` property
    // unless we really have to
    if (array.length !== uniqueIndex + 1) array.length = uniqueIndex + 1

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
