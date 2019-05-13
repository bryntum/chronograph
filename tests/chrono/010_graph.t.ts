import { ChronoAtom, MinimalChronoAtom } from "../../src/chrono/Atom.js"
import { EffectResolutionResult } from "../../src/chrono/Effect.js"
import { ChronoGraph, MinimalChronoGraph } from "../../src/chrono/Graph.js"

declare const StartTest : any

StartTest(t => {

    t.it('Lazy calculated atom, values pre-defined', async t => {
        const graph : ChronoGraph   = MinimalChronoGraph.new()

        const atom1 : ChronoAtom    = graph.addNode(MinimalChronoAtom.new({ value : 0 }))
        const atom2 : ChronoAtom    = graph.addNode(MinimalChronoAtom.new({ value : 1 }))

        const atom3 : ChronoAtom    = graph.addNode(MinimalChronoAtom.new({
            calculation     : function * (proposedValue : number) {
                return (yield atom1) + (yield atom2)
            }
        }))

        t.is(graph.isAtomNeedRecalculation(atom3), true, 'Atom considered dirty in graph - has no value')

        t.is(atom3.hasValue(), false, 'Atom has no value')

        await graph.propagate()

        t.is(atom3.hasValue(), true, "Correct result calculated")
        t.is(atom3.get(), 1, "Correct result calculated")
    })


    t.it('Calculated atom, values set dynamically', async t => {
        const graph : ChronoGraph   = MinimalChronoGraph.new()

        const atom1 : ChronoAtom    = graph.addNode(MinimalChronoAtom.new())
        const atom2 : ChronoAtom    = graph.addNode(MinimalChronoAtom.new())

        const atom3 : ChronoAtom    = graph.addNode(MinimalChronoAtom.new({
            calculation     : function * (proposedValue : number) {
                return (yield atom1) + (yield atom2)
            }
        }))

        atom1.put(0)
        atom2.put(1)

        await graph.propagate()

        t.is(atom3.hasValue(), true, "Correct result calculated")
        t.is(atom3.get(), 1, "Correct result calculated")
    })


    t.it('2 mutations in graph context', async t => {
        const graph : ChronoGraph       = MinimalChronoGraph.new()

        const box1 : ChronoAtom         = graph.addNode(MinimalChronoAtom.new({ id : 'inp1' }))
        const box2 : ChronoAtom         = graph.addNode(MinimalChronoAtom.new({ id : 'inp2' }))

        const box1p2 : ChronoAtom       = graph.addNode(MinimalChronoAtom.new({
            id      : '1p2',

            calculation     : function * () {
                return (yield box1) + (yield box2)
            }
        }))

        const box3 : ChronoAtom         = graph.addNode(MinimalChronoAtom.new({ id : 'inp3' }))

        const res : ChronoAtom          = graph.addNode(MinimalChronoAtom.new({
            id      : 'res',

            calculation : function * () {
                const v1p2      = yield box1p2
                const v3        = yield box3

                // debugger

                return v1p2 + v3
            }
        }))

        box1.put(0)
        box2.put(0)
        box3.put(1)

        await graph.propagate()

        t.isDeeply(box1p2.incoming, new Set([ box1, box2 ]), 'Correct incoming edges for box1ps')
        t.isDeeply(res.incoming, new Set([ box1p2, box3 ]), 'Correct incoming edges for res')

        t.isDeeply(box1.outgoing, new Set([ box1p2 ]), 'Correct outgoing edges for box1')

        t.is(box1p2.get(), 0, "Correct result calculated")
        t.is(res.get(), 1, "Correct result calculated")

        await box1.set(1)

        t.isDeeply(res.incoming, new Set([ box1p2, box3 ]), 'Correct incoming edges for res')

        t.is(box1p2.get(), 1, "Correct result calculated")
        t.is(res.get(), 2, "Correct result calculated")

        await box2.set(1)

        t.isDeeply(res.incoming, new Set([ box1p2, box3 ]), 'Correct incoming edges for res')

        t.is(box1p2.get(), 2, "Correct result calculated")
        t.is(res.get(), 3, "Correct result calculated")
    })


    t.it('2 mutations in graph context', async t => {
        const graph : ChronoGraph       = MinimalChronoGraph.new()

        const box1 : ChronoAtom         = graph.addNode(MinimalChronoAtom.new({ id : 'inp1' }))
        const box2 : ChronoAtom         = graph.addNode(MinimalChronoAtom.new({ id : 'inp2' }))

        const box1p2 : ChronoAtom       = graph.addNode(MinimalChronoAtom.new({
            id      : '1p2',

            calculation : function * () {
                return (yield box1) + (yield box2)
            }
        }))

        const box3 : ChronoAtom         = graph.addNode(MinimalChronoAtom.new({ id : 'inp3' }))

        const res : ChronoAtom          = graph.addNode(MinimalChronoAtom.new({
            id      : 'res',

            calculation : function * () {
                return (yield box1p2) + (yield box3)
            }
        }))

        box1.put(0)
        box2.put(0)
        box3.put(1)

        await graph.propagate()

        t.is(box1p2.get(), 0, "Correct result calculated")
        t.is(res.get(), 1, "Correct result calculated")

        const calculation1Spy   = t.spyOn(box1p2, 'calculation')
        const calculation2Spy   = t.spyOn(res, 'calculation')

        await box1.set(10)

        t.expect(calculation1Spy).toHaveBeenCalled(1)
        t.expect(calculation2Spy).toHaveBeenCalled(1)

        t.is(box1p2.get(), 10, "Correct result calculated")
        t.is(res.get(), 11, "Correct result calculated")

        // should only recalculate mutation2
        const calculation1Spy$  = t.spyOn(box1p2, 'calculation')
        const calculation2Spy$  = t.spyOn(res, 'calculation')

        const spy1              = t.spyOn(box1, 'forEachIncoming')
        const spy2              = t.spyOn(box1, 'forEachOutgoing')

        await box3.set(2)

        t.expect(calculation1Spy$).toHaveBeenCalled(0)
        t.expect(calculation2Spy$).toHaveBeenCalled(1)

        t.expect(spy1).toHaveBeenCalled(0) // should not even visit the box1
        t.expect(spy2).toHaveBeenCalled(0) // should not even visit the box1

        t.is(res.get(), 12, "Correct result calculated")
    })


    t.it('Deep mark as need recalculations', async t => {
        const graph : ChronoGraph       = MinimalChronoGraph.new()

        const atom0 : ChronoAtom       = graph.addNode(MinimalChronoAtom.new({
            id      : 'atom0'
        }))

        const atom1 : ChronoAtom       = graph.addNode(MinimalChronoAtom.new({
            id      : 'atom1',

            calculation : function * () {
                return (yield atom0) + 1
            }
        }))

        const atom2 : ChronoAtom       = graph.addNode(MinimalChronoAtom.new({
            id      : 'atom2',

            calculation : function * () {
                return (yield atom1) + 1
            }
        }))

        const atom3 : ChronoAtom       = graph.addNode(MinimalChronoAtom.new({
            id      : 'atom2',

            calculation : function * () {
                return (yield atom0) + (yield atom2)
            }
        }))

        await atom0.set(0)

        t.is(atom2.get(), 2, "Correct result calculated for atom2")
        t.is(atom3.get(), 2, "Correct result calculated for atom3")

        await atom0.set(1)

        t.is(atom2.get(), 3, "Correct result calculated for atom2")
        t.is(atom3.get(), 4, "Correct result calculated for atom3")
    })


    t.it('Reject should clear all observed edges', async t => {
        const graph : ChronoGraph       = MinimalChronoGraph.new()

        const extraAtom : ChronoAtom       = graph.addNode(MinimalChronoAtom.new({
            calculation : function * (proposeValue : string) {
                return proposeValue !== undefined ? proposeValue : this.value
            }
        }))

        const cycleAtom : ChronoAtom       = graph.addNode(MinimalChronoAtom.new({
            calculation : function * (proposeValue : boolean) {
                return proposeValue !== undefined ? proposeValue : this.value
            }
        }))

        const atom1 : ChronoAtom       = graph.addNode(MinimalChronoAtom.new({
            calculation : function * (proposeValue : number) {
                return proposeValue !== undefined ? proposeValue : this.value
            }
        }))

        const atom2 : ChronoAtom       = graph.addNode(MinimalChronoAtom.new({
            calculation : function * (proposeValue : number) {
                const cycle : boolean = yield cycleAtom

                if (cycle) yield atom3

                return proposeValue !== undefined ? proposeValue : this.value
            }
        }))

        const atom3 : ChronoAtom       = graph.addNode(MinimalChronoAtom.new({
            calculation : function * () {
                const cycle : boolean = yield cycleAtom

                if (cycle) yield extraAtom

                return (yield atom1) + (yield atom2)
            }
        }))

        extraAtom.put("justAnAtom")
        cycleAtom.put(false)
        atom1.put(1)
        atom2.put(1)

        await graph.propagate()

        t.is(cycleAtom.get(), false, "Correct result calculated for cycle atom")
        t.is(atom1.get(), 1, "Correct result calculated for atom1")
        t.is(atom2.get(), 1, "Correct result calculated for atom2")
        t.is(atom3.get(), 2, "Correct result calculated for atom3")

        cycleAtom.put(true)

        // during this propagate the `extraAtom` will go into the `observedDuringCalculation` array of the `atom3`
        await graph.propagate(async effect => EffectResolutionResult.Cancel)

        t.notOk(atom3.incoming.has(extraAtom), "Should not have incoming edge from `extraAtom`")

        t.is(cycleAtom.get(), false, "Should not change atom")
        t.is(atom1.get(), 1, "Should not change atom")
        t.is(atom2.get(), 1, "Should not change atom")
        t.is(atom3.get(), 2, "Should not change atom")

        atom2.put(2)

        // during this propagate the `observedDuringCalculation` array of the `atom3` will be set to the `incoming` property
        await graph.propagate()

        // the key assertion of this test
        t.notOk(atom3.incoming.has(extraAtom), "Should not have incoming edge from `extraAtom`")

        t.is(cycleAtom.get(), false, "Should not change atom")
        t.is(atom1.get(), 1, "Should not change atom")
        t.is(atom2.get(), 2, "Atom updated correctly")
        t.is(atom3.get(), 3, "Atom updated correctly")
    })

})
