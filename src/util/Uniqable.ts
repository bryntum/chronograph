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

    // TODO assuming assigning the same length is no-op, but who knows
    array.length = uniqueIndex + 1
}
