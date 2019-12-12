//---------------------------------------------------------------------------------------------------------------------
export function split<Element> (iterable : Iterable<Element>) : [ Iterable<Element>, Iterable<Element> ] {
    const gen1Pending : Element[]  = []
    const gen2Pending : Element[]  = []

    let iterator : Iterator<Element>

    const gen1 = function * () : Generator<Element, any, undefined> {
        if (!iterator) iterator = iterable[Symbol.iterator]()

        while (true) {
            if (gen1Pending.length) {
                yield* gen1Pending
                gen1Pending.length      = 0
            }

            if (!iterator) break

            const { value, done }       = iterator.next()

            if (done) { iterator = null; break }

            gen2Pending.push(value)

            yield value
        }
    }

    const gen2 = function * () : Generator<Element, any, undefined> {
        if (!iterator) iterator = iterable[Symbol.iterator]()

        while (true) {
            if (gen2Pending.length) {
                yield* gen2Pending
                gen2Pending.length      = 0
            }

            if (!iterator) break

            const { value, done }       = iterator.next()

            if (done) { iterator = null; break }

            gen1Pending.push(value)

            yield value
        }
    }

    return [ gen1(), gen2() ]
}


//---------------------------------------------------------------------------------------------------------------------
export function* inBatchesBySize<Element> (iterator : Iterable<Element>, batchSize : number) : Iterable<Element[]> {
    if (batchSize < 0) throw new Error("Batch size needs to a natural number")
    batchSize   = batchSize | 0

    const runningBatch : Element[]  = []

    for (const el of iterator) {
        if (runningBatch.length === batchSize) {
            yield runningBatch

            runningBatch.length = 0
        }

        runningBatch.push(el)
    }

    if (runningBatch.length > 0) yield runningBatch
}


//---------------------------------------------------------------------------------------------------------------------
export function* filter<Element> (iterator : Iterable<Element>, func : (el : Element, index : number) => boolean) : Iterable<Element> {
    let i   = 0

    for (const el of iterator) {
        if (func(el, i++)) yield el
    }
}


//---------------------------------------------------------------------------------------------------------------------
export function every<Element> (iterator : Iterable<Element>, func : (el : Element, index : number) => boolean) : boolean {
    let i   = 0

    for (const el of iterator) {
        if (!func(el, i++)) return false
    }

    return true
}


//---------------------------------------------------------------------------------------------------------------------
export function some<Element> (iterator : Iterable<Element>, func : (el : Element, index : number) => boolean) : boolean {
    let i   = 0

    for (const el of iterator) {
        if (func(el, i++)) return true
    }

    return false
}


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
        acc                 = func(acc, el, i++)
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
export function* uniqueOnlyBy<Element, UniqueBy> (iterator : Iterable<Element>, func : (el : Element) => UniqueBy) : Iterable<Element> {
    const seen      = new Set<UniqueBy>()

    for (const el of iterator) {
        const uniqueBy  = func(el)

        if (!seen.has(uniqueBy)) {
            seen.add(uniqueBy)

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
export function* concatIterable<Element> (iteratorsProducer : Iterable<Iterable<Element>>) : Iterable<Element> {
    for (const iterator of iteratorsProducer) yield* iterator
}


//---------------------------------------------------------------------------------------------------------------------
// just a chained syntax sugar class
export class ChainedIteratorClass<T> {
    iterable        : Iterable<T>   = undefined


    constructor (iterable : Iterable<T>) {
        if (!iterable) throw new Error("Require an iterable instance for chaining")

        this.iterable       = iterable
    }


    split () : ChainedIteratorClass<T> {
        const [ iter1, iter2 ] = split(this.iterable)

        this.iterable   = iter2

        return new ChainedIteratorClass(iter1)
    }


    inBatchesBySize (batchSize : number) : ChainedIteratorClass<T[]> {
        return new ChainedIteratorClass(inBatchesBySize(this.iterable, batchSize))
    }


    filter (func : (el : T, index : number) => boolean) : ChainedIteratorClass<T> {
        return new ChainedIteratorClass(filter(this.iterable, func))
    }


    map<Result> (func : (el : T, index : number) => Result) : ChainedIteratorClass<Result> {
        return new ChainedIteratorClass(map(this.iterable, func))
    }


    reduce<Result> (func : (acc : Result, el : T, index : number) => Result, initialAcc : Result) : Result {
        return reduce(this.iterable, func, initialAcc)
    }


    concat<K> () : T extends Iterable<K> ? ChainedIteratorClass<K> : never {
        return new ChainedIteratorClass<K>(
            concatIterable<K>(this.iterable as (T extends Iterable<K> ? Iterable<T> : never))
        ) as (T extends Iterable<K> ? ChainedIteratorClass<K> : never)
    }


    uniqueOnly () : ChainedIteratorClass<T> {
        return new ChainedIteratorClass(uniqueOnly(this.iterable))
    }


    uniqueOnlyBy<UniqueBy> (func : (el : T) => UniqueBy) : ChainedIteratorClass<T> {
        return new ChainedIteratorClass(uniqueOnlyBy(this.iterable, func))
    }


    every (func : (el : T, index : number) => boolean) : boolean {
        return every(this.iterable, func)
    }


    some (func : (el : T, index : number) => boolean) : boolean {
        return some(this.iterable, func)
    }


    takeWhile (func : (el : T, index : number) => boolean) : ChainedIteratorClass<T> {
        return new ChainedIteratorClass(takeWhile(this.iterable, func))
    }


    * [Symbol.iterator] () : IterableIterator<T> {
        if (!this.iterable) throw new Error("Chained iterator already exhausted")

        yield* this.iterable

        // practice shows, that cleaning up the iterable after yourself helps garbage collector a lot
        this.iterable   = null
    }


    toArray () : T[] {
        return Array.from(this)
    }


    toSet () : Set<T> {
        return new Set(this)
    }


    toMap<K, V> () : T extends [ K, V ] ? Map<K, V> : never  {
        return new Map<K, V>(this.iterable as (T extends [ K, V ] ? Iterable<T> : never)) as (T extends [ K, V ] ? Map<K, V> : never)
    }


    flush () {
        for (const element of this.iterable) {}
    }


    memoize () : MemoizedIteratorClass<T> {
        return new MemoizedIteratorClass(this.iterable)
    }
}

export const ChainedIterator = <T>(iterator : Iterable<T>) : ChainedIteratorClass<T> => new ChainedIteratorClass<T>(iterator)
export const CI = ChainedIterator

export type ChainedIterator<T> = ChainedIteratorClass<T>


//---------------------------------------------------------------------------------------------------------------------
export class MemoizedIteratorClass<T> extends ChainedIteratorClass<T> {
    elements        : T[]           = []

    $iterable       : Iterable<T>

    set iterable (iterable : Iterable<T>) {
        this.$iterable  = iterable
    }

    get iterable () : Iterable<T> {
        return this
    }

    semicolon

    * [Symbol.iterator] () : IterableIterator<T> {
        if (this.$iterable) {
            for (const element of this.$iterable) {
                this.elements.push(element)

                yield element
            }

            this.$iterable   = null
        } else {
            yield* this.elements
        }
    }
}

export const MemoizedIterator = <T>(iterator : Iterable<T>) : MemoizedIteratorClass<T> => new MemoizedIteratorClass<T>(iterator)
export const MI = MemoizedIterator

export type MemoizedIterator<T> = MemoizedIteratorClass<T>
