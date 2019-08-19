//---------------------------------------------------------------------------------------------------------------------
export function* map<Element, Result> (iterator : IterableIterator<Element>, func : (el : Element, index : number) => Result) : IterableIterator<Result> {
    let i   = 0

    for (const el of iterator) yield func(el, i++)
}


//---------------------------------------------------------------------------------------------------------------------
export function reduce<Element, Result> (iterator : IterableIterator<Element>, func : (acc : Result, el : Element, index : number) => Result, initialAcc : Result) : Result {
    let i   = 0

    let acc : Result        = initialAcc

    for (const el of iterator) {
        acc                 = func(acc, el, i)
    }

    return acc
}



//---------------------------------------------------------------------------------------------------------------------
export function* uniqueOnly<Element> (iterator : IterableIterator<Element>) : IterableIterator<Element> {
    const seen      = new Set<Element>()

    for (const el of iterator) {
        if (!seen.has(el)) {
            seen.add(el)

            yield el
        }
    }
}


//---------------------------------------------------------------------------------------------------------------------
export function* reverse<Element> (iterator : IterableIterator<Element>) : IterableIterator<Element> {
    const all       = Array.from(iterator)

    for (let i = all.length - 1; i >= 0; i--) yield all[ i ]
}


//---------------------------------------------------------------------------------------------------------------------
export function* takeWhile<Element> (iterator : IterableIterator<Element>, func : (el : Element, index : number) => boolean) : IterableIterator<Element> {
    let i   = 0

    for (const el of iterator) {
        if (func(el, i++))
            yield el
        else
            return
    }
}


//---------------------------------------------------------------------------------------------------------------------
export function* takeUntilIncluding<Element> (iterator : IterableIterator<Element>, func : (el : Element, index : number) => boolean) : IterableIterator<Element> {
    let i   = 0

    for (const el of iterator) {
        yield el

        if (func(el, i++)) return
    }
}


//---------------------------------------------------------------------------------------------------------------------
export function* takeUntilExcluding<Element> (iterator : IterableIterator<Element>, func : (el : Element, index : number) => boolean) : IterableIterator<Element> {
    let i   = 0

    for (const el of iterator) {
        if (func(el, i++)) return

        yield el
    }
}


//---------------------------------------------------------------------------------------------------------------------
export function* concat<Element> (...iterators : IterableIterator<Element>[]) : IterableIterator<Element> {
    for (let i = 0; i < iterators.length; i++) yield* iterators[ i ]
}



//---------------------------------------------------------------------------------------------------------------------
export class ChainedIterator<T> {
    iterator        : IterableIterator<T>


    static new (iterator : IterableIterator<any>) {
        return new ChainedIterator(iterator)
    }


    constructor (iterator : IterableIterator<T>) {
        this.iterator       = iterator
    }


    map<Result> (func : (el : T, index : number) => Result) : ChainedIterator<Result> {
        return new ChainedIterator(map(this.iterator, func))
    }


    reduce<Result> (func : (acc : Result, el : T, index : number) => Result, initialAcc : Result) : Result {
        return reduce(this.iterator, func, initialAcc)
    }


    uniqueOnly () : ChainedIterator<T> {
        return new ChainedIterator(uniqueOnly(this.iterator))
    }


    takeWhile (func : (el : T, index : number) => boolean) : ChainedIterator<T> {
        return new ChainedIterator(takeWhile(this.iterator, func))
    }


    * [Symbol.iterator] () {
        yield* this.iterator
    }
}
