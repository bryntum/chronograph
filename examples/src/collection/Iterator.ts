//---------------------------------------------------------------------------------------------------------------------
/**
 * Given a single `Iterable`, returns an array of 2 iterables, mirroring the original one (which should not be used anymore).
 *
 * For example:
 *
 *     const gen = function* () { yield 1; yield 2; yield 3 }
 *
 *     const [ iterable1, iterable2 ] = split(gen())
 *     const [ iter1, iter2 ] = [
 *         iterable1[ Symbol.iterator ](),
 *         iterable2[ Symbol.iterator ]()
 *     ]
 *
 *     iter1.next() // 1
 *     iter2.next() // 1
 *     iter2.next() // 2
 *     iter2.next() // 3
 *     iter1.next() // 2
 *     iter1.next() // 3
 *     iter1.next() // done
 *     iter2.next() // done
 *
 * @param iterable
 */
export function split<Element> (iterable : Iterable<Element>) : [ Iterable<Element>, Iterable<Element> ] {
    const gen1Pending : Element[]  = []
    const gen2Pending : Element[]  = []

    let iterator : Iterator<Element>

    const gen1 = function * () : Generator<Element, any, undefined> {
        if (!iterator) iterator = iterable[ Symbol.iterator ]()

        while (true) {
            if (gen1Pending.length) {
                yield* gen1Pending
                gen1Pending.length      = 0
            }

            if (!iterator) break

            const { value, done }       = iterator.next()

            if (done) { iterator = null; iterable = null; break }

            gen2Pending.push(value)

            yield value
        }
    }

    const gen2 = function * () : Generator<Element, any, undefined> {
        if (!iterator) iterator = iterable[ Symbol.iterator ]()

        while (true) {
            if (gen2Pending.length) {
                yield* gen2Pending
                gen2Pending.length      = 0
            }

            if (!iterator) break

            const { value, done }       = iterator.next()

            if (done) { iterator = null; iterable = null; break }

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
export function* drop<Element> (iterator : Iterable<Element>, howMany : number) : Iterable<Element> {
    let i   = 0

    for (const el of iterator) {
        if (++i > howMany) yield el
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
// note, that we either use a combination of `this.derive()` + this.iterable (which will clear the `this.iterable`)
// or, use just `this` as iterable, which will also clear the iterator
//
export class ChainedIteratorClass<T> {
    iterable        : Iterable<T>   = undefined


    constructor (iterable : Iterable<T>) {
        if (!iterable) throw new Error("Require an iterable instance for chaining")

        this.iterable   = iterable
    }


    derive<K> (iterable : Iterable<K>) : ChainedIteratorClass<K> {
        this.iterable   = undefined

        return new ChainedIteratorClass(iterable)
    }


    copy () : ChainedIteratorClass<T> {
        const [ iter1, iter2 ] = split(this.iterable)

        this.iterable   = iter2

        return new ChainedIteratorClass(iter1)
    }


    split () : [ ChainedIteratorClass<T>, ChainedIteratorClass<T> ] {
        const [ iter1, iter2 ] = split(this.iterable)

        return [ new ChainedIteratorClass(iter1), this.derive(iter2) ]
    }


    inBatchesBySize (batchSize : number) : ChainedIteratorClass<T[]> {
        return this.derive(inBatchesBySize(this.iterable, batchSize))
    }


    filter (func : (el : T, index : number) => boolean) : ChainedIteratorClass<T> {
        return this.derive(filter(this.iterable, func))
    }


    drop (howMany : number) : ChainedIteratorClass<T> {
        return this.derive(drop(this.iterable, howMany))
    }


    map<Result> (func : (el : T, index : number) => Result) : ChainedIteratorClass<Result> {
        return this.derive(map(this.iterable, func))
    }


    reduce<Result> (func : (acc : Result, el : T, index : number) => Result, initialAcc : Result) : Result {
        return reduce(this, func, initialAcc)
    }


    concat () : T extends Iterable<infer K> ? ChainedIteratorClass<K> : never {
        //@ts-ignore
        return this.derive(concatIterable(this.iterable))
    }


    uniqueOnly () : ChainedIteratorClass<T> {
        return this.derive(uniqueOnly(this.iterable))
    }


    uniqueOnlyBy<UniqueBy> (func : (el : T) => UniqueBy) : ChainedIteratorClass<T> {
        return this.derive(uniqueOnlyBy(this.iterable, func))
    }


    every (func : (el : T, index : number) => boolean) : boolean {
        return every(this, func)
    }


    some (func : (el : T, index : number) => boolean) : boolean {
        return some(this, func)
    }


    takeWhile (func : (el : T, index : number) => boolean) : ChainedIteratorClass<T> {
        return this.derive(takeWhile(this.iterable, func))
    }


    * [Symbol.iterator] () : IterableIterator<T> {
        let iterable    = this.iterable

        if (!iterable) throw new Error("Chained iterator already exhausted or used to derive the new one")

        // practice shows, that cleaning up the iterable after yourself helps garbage collector a lot
        this.iterable   = undefined

        yield* iterable

        // yes, we really want to avoid memory leaks
        iterable        = undefined
    }


    toArray () : T[] {
        return Array.from(this)
    }


    sort (order : (v1 : T, v2 : T) => number) : T[] {
        return Array.from(this).sort(order)
    }


    toSet () : Set<T> {
        return new Set(this)
    }


    toMap () : T extends [ infer K, infer V ] ? Map<K, V> : never  {
        //@ts-ignore
        return new Map(this)
    }

    // toMap<K, V> () : T extends [ K, V ] ? Map<K, V> : never  {
    //     return new Map<K, V>(this.iterable as (T extends [ K, V ] ? Iterable<T> : never)) as (T extends [ K, V ] ? Map<K, V> : never)
    // }


    flush () {
        for (const element of this) {}
    }


    memoize () : MemoizedIteratorClass<T> {
        return new MemoizedIteratorClass(this)
    }
}

export const ChainedIterator = <T>(iterator : Iterable<T>) : ChainedIteratorClass<T> => new ChainedIteratorClass<T>(iterator)
export const CI = ChainedIterator

export type ChainedIterator<T> = ChainedIteratorClass<T>


//---------------------------------------------------------------------------------------------------------------------
export class MemoizedIteratorClass<T> extends ChainedIteratorClass<T> {
    elements        : T[]           = []

    $iterable       : Iterable<T>
    $iterator       : Iterator<T>   = undefined

    set iterable (iterable : Iterable<T>) {
        this.$iterable  = iterable
    }

    get iterable () : Iterable<T> {
        return this
    }


    derive<K> (iterable : Iterable<K>) : ChainedIteratorClass<K> {
        return new ChainedIteratorClass(iterable)
    }


    * [Symbol.iterator] () : IterableIterator<T> {
        const elements      = this.elements

        if (this.$iterable) {
            if (!this.$iterator) this.$iterator = this.$iterable[ Symbol.iterator ]()

            let iterator            = this.$iterator
            let alreadyConsumed     = elements.length

            // yield the 1st batch "efficiently"
            if (alreadyConsumed > 0) yield* elements

            while (true) {
                if (elements.length > alreadyConsumed) {
                    // wonder if `yield* elements.slice(alreadyConsumed)` is more performant or not
                    for (let i = alreadyConsumed; i < elements.length; i++) yield elements[ i ]

                    alreadyConsumed             = elements.length
                }

                if (!iterator) break

                const { value, done }           = iterator.next()

                if (done) {
                    iterator = this.$iterator   = null
                    this.$iterable              = null
                } else {
                    elements.push(value)

                    alreadyConsumed++

                    yield value
                }
            }
        } else {
            yield* elements
        }
    }
}

export const MemoizedIterator = <T>(iterator : Iterable<T>) : MemoizedIteratorClass<T> => new MemoizedIteratorClass<T>(iterator)
export const MI = MemoizedIterator

export type MemoizedIterator<T> = MemoizedIteratorClass<T>
