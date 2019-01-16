import {ChronoAtom, MinimalChronoAtom} from "../../src/chrono/Atom.js";
import {ChronoGraph, MinimalChronoGraph} from "../../src/chrono/Graph.js";

declare const StartTest : any

StartTest(t => {

    t.it('Lazy calculated atom, values pre-defined', t => {
        const graph : ChronoGraph   = MinimalChronoGraph.new()

        const atom1 : ChronoAtom    = graph.addNode(MinimalChronoAtom.new({ value : 0 }))
        const atom2 : ChronoAtom    = graph.addNode(MinimalChronoAtom.new({ value : 1 }))

        const atom3 : ChronoAtom    = graph.addNode(MinimalChronoAtom.new({
            calculation     : function * (proposedValue : number) {
                return (yield atom1) + (yield atom2)
            }
        }))

        t.is(atom1.isDirty(), false, 'Atom considered not dirty')
        t.is(atom2.isDirty(), false, 'Atom considered not dirty')
        t.is(atom3.isDirty(), false, 'Atom considered not dirty has no `nextValue`')

        t.is(graph.isAtomDirty(atom3), true, 'Atom considered dirty in graph - has no value')

        t.is(atom3.hasValue(), false, 'Atom has no value')

        graph.propagate()

        t.is(atom3.hasValue(), true, "Correct result calculated")
        t.is(atom3.get(), 1, "Correct result calculated")
    })


    t.it('Calculated atom, values set dynamically', t => {
        const graph : ChronoGraph   = MinimalChronoGraph.new()

        const atom1 : ChronoAtom    = graph.addNode(MinimalChronoAtom.new())
        const atom2 : ChronoAtom    = graph.addNode(MinimalChronoAtom.new())

        const atom3 : ChronoAtom    = graph.addNode(MinimalChronoAtom.new({
            calculation     : function * (proposedValue : number) {
                return (yield atom1) + (yield atom2)
            }
        }))

        t.is(atom1.isDirty(), false, 'Atom considered not dirty')
        t.is(atom2.isDirty(), false, 'Atom considered not dirty')
        t.is(atom3.isDirty(), false, 'Atom dirty - calculated on graph entry')

        atom1.set(0)
        atom2.set(1)

        t.is(atom1.isDirty(), true, 'Atom considered not dirty')
        t.is(atom2.isDirty(), true, 'Atom considered not dirty')
        t.is(atom3.isDirty(), false, 'Atom considered not dirty - not propagated yet')

        graph.propagate()

        t.is(atom3.get(), 1, "Correct result calculated")
    })


    t.it('2 mutations in graph context', t => {
        const graph : ChronoGraph       = MinimalChronoGraph.new()

        const box1 : ChronoAtom         = graph.getOrCreateAtom('inp1')
        const box2 : ChronoAtom         = graph.getOrCreateAtom('inp2')

        const box1p2 : ChronoAtom       = graph.addNode(MinimalChronoAtom.new({
            id      : '1p2',

            calculation     : function * () {
                return (yield box1) + (yield box2)
            }
        }))

        const box3 : ChronoAtom         = graph.getOrCreateAtom('inp3')

        const res : ChronoAtom          = graph.addNode(MinimalChronoAtom.new({
            id      : 'res',

            calculation : function * () {
                const v1p2      = yield box1p2
                const v3        = yield box3

                // debugger

                return v1p2 + v3
            }
        }))

        box1.set(0)
        box2.set(0)
        box3.set(1)

        graph.propagate()

        t.isDeeply(box1p2.incoming, new Set([ box1, box2 ]), 'Correct incoming edges for box1ps')
        t.isDeeply(res.incoming, new Set([ box1p2, box3 ]), 'Correct incoming edges for res')

        t.isDeeply(box1.outgoing, new Set([ box1p2 ]), 'Correct outgoing edges for box1')

        t.is(box1p2.get(), 0, "Correct result calculated")
        t.is(res.get(), 1, "Correct result calculated")

        box1.set(1)

        graph.propagate()

        t.isDeeply(res.incoming, new Set([ box1p2, box3 ]), 'Correct incoming edges for res')

        t.is(box1p2.get(), 1, "Correct result calculated")
        t.is(res.get(), 2, "Correct result calculated")

        box2.set(1)

        graph.propagate()

        t.isDeeply(res.incoming, new Set([ box1p2, box3 ]), 'Correct incoming edges for res')

        t.is(box1p2.get(), 2, "Correct result calculated")
        t.is(res.get(), 3, "Correct result calculated")
    })


    t.it('2 mutations in graph context', t => {
        const graph : ChronoGraph       = MinimalChronoGraph.new()

        const box1 : ChronoAtom         = graph.getOrCreateAtom('inp1')
        const box2 : ChronoAtom         = graph.getOrCreateAtom('inp2')

        const box1p2 : ChronoAtom       = graph.addNode(MinimalChronoAtom.new({
            id      : '1p2',

            calculation : function * () {
                return (yield box1) + (yield box2)
            }
        }))

        const box3 : ChronoAtom         = graph.getOrCreateAtom('inp3')

        const res : ChronoAtom          = graph.addNode(MinimalChronoAtom.new({
            id      : 'res',

            calculation : function * () {
                return (yield box1p2) + (yield box3)
            }
        }))

        box1.set(0)
        box2.set(0)
        box3.set(1)

        graph.propagate()

        t.is(box1p2.get(), 0, "Correct result calculated")
        t.is(res.get(), 1, "Correct result calculated")

        const calculation1Spy   = t.spyOn(box1p2, 'calculation')
        const calculation2Spy   = t.spyOn(res, 'calculation')

        box1.set(10)

        graph.propagate()

        t.expect(calculation1Spy).toHaveBeenCalled(1)
        t.expect(calculation2Spy).toHaveBeenCalled(1)

        t.is(box1p2.get(), 10, "Correct result calculated")
        t.is(res.get(), 11, "Correct result calculated")

        // should only recalculate mutation2
        const calculation1Spy$  = t.spyOn(box1p2, 'calculation')
        const calculation2Spy$  = t.spyOn(res, 'calculation')

        const spy1              = t.spyOn(box1, 'forEachIncoming')
        const spy2              = t.spyOn(box1, 'forEachOutgoing')

        box3.set(2)

        graph.propagate()

        t.expect(calculation1Spy$).toHaveBeenCalled(0)
        t.expect(calculation2Spy$).toHaveBeenCalled(1)

        t.expect(spy1).toHaveBeenCalled(0) // should not even visit the box1
        t.expect(spy2).toHaveBeenCalled(0) // should not even visit the box1

        t.is(res.get(), 12, "Correct result calculated")
    })

})
