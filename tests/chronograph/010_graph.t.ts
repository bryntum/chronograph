import {ChronoAtom, MinimalChronoAtom} from "../../src/chrono/Atom.js";
import {ChronoGraph, MinimalChronoGraph} from "../../src/chrono/Graph.js";

declare const StartTest : any

StartTest(t => {

    t.it('Lazy calculated atom, values pre-defined', t => {
        const graph : ChronoGraph   = MinimalChronoGraph.new()

        const atom1 : ChronoAtom    = graph.addNode(MinimalChronoAtom.new({ value : 0 }))
        const atom2 : ChronoAtom    = graph.addNode(MinimalChronoAtom.new({ value : 1 }))

        const atom3 : ChronoAtom    = graph.addNode(MinimalChronoAtom.new({
            lazy            : true,

            calculation     : (proposedValue : number) => {
                return atom1.get() + atom2.get()
            }
        }))

        t.is(atom1.isDirty(), false, 'Atom considered not dirty')
        t.is(atom2.isDirty(), false, 'Atom considered not dirty')
        t.is(atom3.isDirty(), false, 'Atom considered not dirty - it lazy and has no value')

        t.is(atom3.hasValue(), false, 'Atom has no value')

        t.is(atom3.get(), 1, "Correct result calculated")

        t.is(atom3.isDirty(), true, 'Atom considered dirty - now it has value, that has not been commited')

        graph.commit()

        t.is(atom3.isDirty(), false, 'Atom committed')
    })


    t.it('Eager calculated atom, values pre-defined', t => {
        const graph : ChronoGraph   = MinimalChronoGraph.new()

        const atom1 : ChronoAtom    = graph.addNode(MinimalChronoAtom.new({ value : 0 }))
        const atom2 : ChronoAtom    = graph.addNode(MinimalChronoAtom.new({ value : 1 }))

        const atom3 : ChronoAtom    = graph.addNode(MinimalChronoAtom.new({
            lazy            : false,

            calculation     : (proposedValue : number) => {
                return atom1.get() + atom2.get()
            }
        }))

        t.is(atom1.isDirty(), false, 'Atom considered not dirty')
        t.is(atom2.isDirty(), false, 'Atom considered not dirty')
        t.is(atom3.hasValue(), true, 'Atom has value - eager calculation')

        t.is(atom3.get(), 1, "Correct result calculated")
    })


    t.it('Calculated atom, values set dynamically', t => {
        const graph : ChronoGraph   = MinimalChronoGraph.new()

        const atom1 : ChronoAtom    = graph.addNode(MinimalChronoAtom.new())
        const atom2 : ChronoAtom    = graph.addNode(MinimalChronoAtom.new())

        const atom3 : ChronoAtom    = graph.addNode(MinimalChronoAtom.new({
            calculation     : (proposedValue : number) => {
                return atom1.get() + atom2.get()
            }
        }))

        t.is(atom1.isDirty(), false, 'Atom considered not dirty')
        t.is(atom2.isDirty(), false, 'Atom considered not dirty')
        t.is(atom3.isDirty(), false, 'Atom considered not dirty - has no value')

        atom1.set(0)
        atom2.set(1)

        t.is(atom1.isDirty(), true, 'Atom considered not dirty')
        t.is(atom2.isDirty(), true, 'Atom considered not dirty')
        t.is(atom3.isDirty(), false, 'Atom considered not dirty - has no value')

        t.is(atom3.get(), 1, "Correct result calculated")

    })


    t.it('2 mutations in graph context', t => {
        const graph : ChronoGraph       = MinimalChronoGraph.new()

        const box1 : ChronoAtom         = graph.getOrCreateAtom('inp1')
        const box2 : ChronoAtom         = graph.getOrCreateAtom('inp2')

        const box1p2 : ChronoAtom       = graph.addNode(MinimalChronoAtom.new({
            id      : '1p2',

            calculation : () => {
                return box1.get() + box2.get()
            }
        }))

        const box3 : ChronoAtom         = graph.getOrCreateAtom('inp3')

        const res : ChronoAtom          = graph.addNode(MinimalChronoAtom.new({
            id      : 'res',

            calculation : () => {
                return box1p2.get() + box3.get()
            }
        }))

        box1.set(0)
        box2.set(0)
        box3.set(1)

        t.is(box1p2.get(), 0, "Correct result calculated")
        t.is(res.get(), 1, "Correct result calculated")

        graph.commit()

        box1.set(1)

        graph.propagate()

        t.is(res.get(), 2, "Correct result calculated")

        box2.set(1)

        graph.propagate()

        t.is(res.get(), 3, "Correct result calculated")
    })


    t.it('2 mutations in graph context', t => {
        const graph : ChronoGraph       = MinimalChronoGraph.new()

        const box1 : ChronoAtom         = graph.getOrCreateAtom('inp1')
        const box2 : ChronoAtom         = graph.getOrCreateAtom('inp2')

        const box1p2 : ChronoAtom       = graph.addNode(MinimalChronoAtom.new({
            id      : '1p2',

            calculation : () => {
                return box1.get() + box2.get()
            }
        }))

        const box3 : ChronoAtom         = graph.getOrCreateAtom('inp3')

        const res : ChronoAtom          = graph.addNode(MinimalChronoAtom.new({
            id      : 'res',

            calculation : () => {
                return box1p2.get() + box3.get()
            }
        }))

        box1.set(0)
        box2.set(0)
        box3.set(1)

        t.is(box1p2.get(), 0, "Correct result calculated")
        t.is(res.get(), 1, "Correct result calculated")

        // initial state
        graph.commit()

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
