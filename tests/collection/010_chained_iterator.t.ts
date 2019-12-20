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
        const iter2 : Iterable<number>              = iter1.map(el => el.length)

        t.isDeeply(Array.from(iter1), [ '1', '12', '123' ])
        t.isDeeply(Array.from(iter1), [ '1', '12', '123' ])

        t.isDeeply(Array.from(iter2), [ 1, 2, 3 ])
    })


    t.it('Should be able to use iterators, derived from the memoized iterator in any order', t => {
        const a : Set<string>               = new Set([ '1', '12', '123' ])

        const iter1 : MemoizedIterator<string>      = MI(a)
        const iter2 : Iterable<number>              = iter1.map(el => el.length)
        const iter3 : Iterable<string>              = iter1.map(el => el.repeat(2))

        const iterator2     = iter2[ Symbol.iterator ]()
        const iterator3     = iter3[ Symbol.iterator ]()

        t.isDeeply(
            [ iterator2.next().value, iterator3.next().value ],
            [ 1, '11' ]
        )

        // opposite order
        t.isDeeply(
            [ iterator3.next().value, iterator2.next().value ],
            [ '1212', 2 ]
        )

        t.isDeeply(
            [ iterator2.next().value, iterator3.next().value ],
            [ 3, '123123' ]
        )

        t.isDeeply(
            [ iterator3.next().done, iterator2.next().done ],
            [ true, true ]
        )
    })
})


