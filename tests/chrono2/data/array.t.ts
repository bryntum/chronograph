import { MappedReactiveArrayAtom, ReactiveArray } from "../../../src/chrono2/data/Array.js"
import { ChronoGraph, globalGraph } from "../../../src/chrono2/graph/Graph.js"
import { delay } from "../../../src/util/Helpers.js"

declare const StartTest : any

StartTest(t => {

    t.it('Reactive array should work', async t => {
        const array      = ReactiveArray.new()

        globalGraph.addAtom(array)

        array.push(1, 2, 3)

        t.is(array.item(0), 1)
        t.is(array.item(1), 2)
        t.is(array.item(2), 3)

        array.push(4)

        t.is(array.item(0), 1)
        t.is(array.item(1), 2)
        t.is(array.item(2), 3)
        t.is(array.item(3), 4)
    })


    t.it('Reactive array should work', async t => {
        const array      = ReactiveArray.new()

        globalGraph.addAtom(array)

        array.write([ 1, 2, 3 ])

        t.is(array.item(0), 1)
        t.is(array.item(1), 2)
        t.is(array.item(2), 3)
    })


    t.it('Mapped reactive array should work #1', async t => {
        const array     = ReactiveArray.new()

        globalGraph.addAtom(array)

        array.push(1, 2, 3)

        const mapped : MappedReactiveArrayAtom = array.map(el => el * 2)
        const mapped2 : MappedReactiveArrayAtom = mapped.map(el => el * 2)

        t.is(mapped.item(0), 2)
        t.is(mapped.item(1), 4)
        t.is(mapped.item(2), 6)

        t.is(mapped2.item(0), 4)
        t.is(mapped2.item(1), 8)
        t.is(mapped2.item(2), 12)

        array.push(4)

        t.is(mapped.item(0), 2)
        t.is(mapped.item(1), 4)
        t.is(mapped.item(2), 6)
        t.is(mapped.item(3), 8)

        t.is(mapped2.item(0), 4)
        t.is(mapped2.item(1), 8)
        t.is(mapped2.item(2), 12)
        t.is(mapped2.item(3), 16)
    })


    t.it('Mapped reactive array should work #2', async t => {
        const array     = ReactiveArray.new()

        globalGraph.addAtom(array)

        array.write([ 1, 2, 3 ])

        const mapped : MappedReactiveArrayAtom = array.map(el => el * 2)
        const mapped2 : MappedReactiveArrayAtom = mapped.map(el => el * 2)

        t.is(mapped.item(0), 2)
        t.is(mapped.item(1), 4)
        t.is(mapped.item(2), 6)

        t.is(mapped2.item(0), 4)
        t.is(mapped2.item(1), 8)
        t.is(mapped2.item(2), 12)

        array.write([ 4 ])

        t.is(mapped.item(0), 8)

        t.is(mapped2.item(0), 16)
    })


    t.it('Mapped reactive array should work #3', async t => {
        const array     = ReactiveArray.new()

        const graph     = ChronoGraph.new({ autoCommit : false, historyLimit : 0 })

        graph.addAtom(array)

        const mapped : MappedReactiveArrayAtom = array.map(el => el * 2)

        array.push(1, 2, 3)

        graph.commit()

        const mapped2 : MappedReactiveArrayAtom = mapped.map(el => el * 2)

        t.is(mapped.item(0), 2)
        t.is(mapped.item(1), 4)
        t.is(mapped.item(2), 6)

        t.is(mapped2.item(0), 4)
        t.is(mapped2.item(1), 8)
        t.is(mapped2.item(2), 12)
    })

})
