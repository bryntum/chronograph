//---------------------------------------------------------------------------------------------------------------------
export function* map<Element, Result> (iterator : Iterable<Element>, func : (el : Element, index : number) => Result) : Iterable<Result> {
    let i   = 0

    for (const el of iterator) yield func(el, i++)
}


//---------------------------------------------------------------------------------------------------------------------
export function reduce<Element, Result> (iterator : Iterable<Element>, func : (acc : Result, el : Element, index : number) => Result, initialAcc : Result) : Result {
    let i   = 0

    let acc : Result        = initialAcc

    for (const el of iterator) {
        acc                 = func(acc, el, i)
    }

    return acc
}



//---------------------------------------------------------------------------------------------------------------------
export function* uniqueOnly<Element> (iterator : Iterable<Element>) : Iterable<Element> {
    const seen      = new Set<Element>()

    for (const el of iterator) {
        if (!seen.has(el)) {
            seen.add(el)

            yield el
        }
    }
}


//---------------------------------------------------------------------------------------------------------------------
export function* reverse<Element> (iterator : Iterable<Element>) : Iterable<Element> {
    const all       = Array.from(iterator)

    for (let i = all.length - 1; i >= 0; i--) yield all[ i ]
}


//---------------------------------------------------------------------------------------------------------------------
export function* takeWhile<Element> (iterator : Iterable<Element>, func : (el : Element, index : number) => boolean) : Iterable<Element> {
    let i   = 0

    for (const el of iterator) {
        if (func(el, i++))
            yield el
        else
            return
    }
}


//---------------------------------------------------------------------------------------------------------------------
export function* takeUntilIncluding<Element> (iterator : Iterable<Element>, func : (el : Element, index : number) => boolean) : Iterable<Element> {
    let i   = 0

    for (const el of iterator) {
        yield el

        if (func(el, i++)) return
    }
}


//---------------------------------------------------------------------------------------------------------------------
export function* takeUntilExcluding<Element> (iterator : Iterable<Element>, func : (el : Element, index : number) => boolean) : Iterable<Element> {
    let i   = 0

    for (const el of iterator) {
        if (func(el, i++)) return

        yield el
    }
}


//---------------------------------------------------------------------------------------------------------------------
export function* concat<Element> (...iterators : Iterable<Element>[]) : Iterable<Element> {
    for (let i = 0; i < iterators.length; i++) yield* iterators[ i ]
}



//---------------------------------------------------------------------------------------------------------------------
// just a chained syntax sugar class
export class ChainedIteratorClass<T> {
    iterator        : Iterable<T>


    constructor (iterator : Iterable<T>) {
        this.iterator       = iterator
    }


    map<Result> (func : (el : T, index : number) => Result) : ChainedIteratorClass<Result> {
        return new ChainedIteratorClass(map(this.iterator, func))
    }


    reduce<Result> (func : (acc : Result, el : T, index : number) => Result, initialAcc : Result) : Result {
        return reduce(this.iterator, func, initialAcc)
    }


    uniqueOnly () : ChainedIteratorClass<T> {
        return new ChainedIteratorClass(uniqueOnly(this.iterator))
    }


    takeWhile (func : (el : T, index : number) => boolean) : ChainedIteratorClass<T> {
        return new ChainedIteratorClass(takeWhile(this.iterator, func))
    }


    * [Symbol.iterator] () {
        yield* this.iterator
    }
}

export const ChainedIterator = <T>(iterator : Iterable<T>) => new ChainedIteratorClass<T>(iterator)
