import { CI, map } from "../../src/collection/Iterator.js"

declare const StartTest : any

StartTest(t => {

    t.it('Should be able to use chained iterators', t => {
        const a : Set<string> = new Set()

        const iter1 : Iterable<string>         = CI(a)

        const iter2 : Iterable<number>         = map(a, el => el.length)
    })
})


