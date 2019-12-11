import { CI, map, MemoizedIterator, MI } from "../../src/collection/Iterator.js"

declare const StartTest : any

StartTest(t => {

    t.it('Should be able to use chained iterators', t => {
        const a : Set<string>               = new Set([ '1', '12', '123' ])

        const iter1 : Iterable<string>      = CI(a)
        const iter2 : Iterable<number>      = map(a, el => el.length)

        t.isDeeply(Array.from(iter1), [ '1', '12', '123' ])
        t.isDeeply(Array.from(iter2), [ 1, 2, 3 ])
    })


    t.it('Should be able to use memoized iterators', t => {
        const a : Set<string>               = new Set([ '1', '12', '123' ])

        const iter1 : MemoizedIterator<string>      = MI(a)
        const iter2 : Iterable<number>      = iter1.map(el => el.length)

        t.isDeeply(Array.from(iter1), [ '1', '12', '123' ])
        t.isDeeply(Array.from(iter1), [ '1', '12', '123' ])

        t.isDeeply(Array.from(iter2), [ 1, 2, 3 ])
    })

})


