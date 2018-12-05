import {MinimalImmutable} from "../../src/chrono/Immutable.js";

declare const StartTest : any

StartTest(t => {

    t.it('Can create empty Immutable', t => {
        const node      = MinimalImmutable.new()

        t.is(node.hasValue(), false, 'No value initially provided')
        t.is(node.get(), undefined, 'No value initially provided')
        t.is(node.previous, undefined, 'Can track the old value')
    })


    t.it('Can create filled Immutable', t => {
        const node      = MinimalImmutable.new({ value : 1 })

        t.is(node.hasValue(), true, 'Can set value')
        t.is(node.get(), 1, 'Can set value')
        t.is(node.previous, undefined, 'Can track the old value')
    })


    t.it('Can advance the Immutable forward in time, tracking the past', t => {
        const node      = MinimalImmutable.new()

        const node1     = node.set(1)

        t.is(node, node1, 'Empty node is filled with value')

        t.is(node1.hasValue(), true, 'Can set value')
        t.is(node1.get(), 1, 'Can set value')
        t.is(node1.previous, undefined, 'Can track the old value')

        const node2     = node1.set(2)

        t.isnt(node2, node1, 'Non empty node derives a new one on `set`')

        t.is(node2.get(), 2, 'Can update value')
        t.is(node2.previous.get(), 1, 'Can track the old value')

        const node3     = node2.set(3)

        t.isnt(node3, node2, 'Non empty node derives a new one on `set`')

        t.is(node3.get(), 3, 'Can update value')
        t.is(node3.previous.get(), 2, 'Can track the old value')
        t.is(node3.previous.previous.get(), 1, 'Can track the old value')
        t.is(node3.previous.previous.previous, undefined, 'Can track the old value')
    })


    t.it('Can start several branches', t => {
        const node      = MinimalImmutable.new({ value : 1 })

        const branch1   = node.set(2)
        const branch2   = node.set(3)

        t.isnt(branch1, node, 'New branch derived')
        t.isnt(branch2, node, 'New branch derived')

        t.isnt(branch1, branch2, 'New branch derived')
        t.is(branch1.previous, branch2.previous, 'Both reference the same previous atom')

        t.is(branch1.get(), 2, 'Can update value')
        t.is(branch1.previous.get(), 1, 'Can track the old value')

        t.is(branch2.get(), 3, 'Can update value')
        t.is(branch2.previous.get(), 1, 'Can track the old value')
    })


})
