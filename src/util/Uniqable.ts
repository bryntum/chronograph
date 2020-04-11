import { MIN_SMI } from "./Helpers.js"

export interface Uniqable {
    uniqable        : number
}


let UNIQABLE : number = MIN_SMI


// in-place mutation
export const compact = (array : Uniqable[]) => {
    const uniqableId : number   = ++UNIQABLE

    let uniqueIndex : number    = -1

    for (let i = 0; i < array.length; ++i) {
        const element : Uniqable    = array[ i ]

        if (element.uniqable !== uniqableId) {
            element.uniqable    = uniqableId

            ++uniqueIndex

            if (uniqueIndex !== i) array[ uniqueIndex ] = element
        }
    }

    // assuming its better to not touch the array's `length` property
    // unless we really have to
    if (array.length !== uniqueIndex + 1) array.length = uniqueIndex + 1
}
