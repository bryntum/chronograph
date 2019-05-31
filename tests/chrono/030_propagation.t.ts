import { ChronoGraph, MinimalChronoGraph } from "../../src/chrono/Graph.js"

declare const StartTest : any

StartTest(t => {

    t.it('Should not recalculate nodes outside of affected scope', async t => {
        const graph : ChronoGraph       = MinimalChronoGraph.new()

        const box1      = graph.variable(0)
        const box2      = graph.variable(0)

        const box1p2    = graph.identifier(function * () {
            return (yield box1) + (yield box2)
        })

        const box3      = graph.variable(1)

        const res     = graph.identifier(function * () {
            return (yield box1p2) + (yield box3)
        })

        // ----------------
        const calculation1Spy   = t.spyOn(box1p2, 'calculation')
        const calculation2Spy   = t.spyOn(res, 'calculation')

        graph.propagate()

        t.is(graph.read(box1p2), 0, "Correct result calculated")
        t.is(graph.read(res), 1, "Correct result calculated")

        t.expect(calculation1Spy).toHaveBeenCalled(1)
        t.expect(calculation2Spy).toHaveBeenCalled(1)

        // ----------------
        calculation1Spy.reset()
        calculation2Spy.reset()

        graph.write(box1, 10)

        graph.propagate()

        t.is(graph.read(box1p2), 10, "Correct result calculated")
        t.is(graph.read(res), 11, "Correct result calculated")

        t.expect(calculation1Spy).toHaveBeenCalled(1)
        t.expect(calculation2Spy).toHaveBeenCalled(1)


        // ----------------
        calculation1Spy.reset()
        calculation2Spy.reset()

        graph.write(box3, 2)

        graph.propagate()

        t.is(graph.read(box1p2), 10, "Correct result calculated")
        t.is(graph.read(res), 12, "Correct result calculated")

        t.expect(calculation1Spy).toHaveBeenCalled(0)
        t.expect(calculation2Spy).toHaveBeenCalled(1)
    })


    t.it('Should eliminate unchanged trees', async t => {
        const graph : ChronoGraph       = MinimalChronoGraph.new()

        const i1        = graph.variableId('i1', 0)
        const i2        = graph.variableId('i2', 10)

        const c1        = graph.identifierId('c1', function* () {
            return (yield i1) + (yield i2)
        })

        const c2        = graph.identifierId('c2', function* () {
            return (yield i1) + (yield c1)
        })

        const c3        = graph.identifierId('c3', function* () {
            return (yield c1)
        })

        const c4        = graph.identifierId('c4', function* () {
            return (yield c3)
        })

        const c5        = graph.identifierId('c5', function* () {
            return (yield c3)
        })

        const c6        = graph.identifierId('c6', function* () {
            return (yield c5) + (yield i2)
        })

        // ----------------
        const nodes             = [ i1, i2, c1, c2, c3, c4, c5, c6 ]

        const spies             = nodes.map(calculation => t.spyOn(calculation, 'calculation'))

        graph.propagate()

        t.isDeeply(nodes.map(node => graph.read(node)), [ 0, 10, 10, 10, 10, 10, 10, 20 ], "Correct result calculated")

        spies.forEach(spy => t.expect(spy).toHaveBeenCalled(1))

        // ----------------
        spies.forEach(spy => spy.reset())

        graph.write(i1, 5)
        graph.write(i2, 5)

        graph.propagate()

        t.isDeeply(nodes.map(node => graph.read(node)), [ 5, 5, 10, 15, 10, 10, 10, 15 ], "Correct result calculated")

        const expectedCalls     = [ 1, 1, 1, 1, 0, 0, 0, 1 ]

        spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled(expectedCalls[ index ]))
    })


    t.it('Should determine all potentially changed nodes', async t => {
        const graph : ChronoGraph       = MinimalChronoGraph.new()

        const atom0     = graph.variable(0)

        const atom1     = graph.identifier(function * () {
            return (yield atom0) + 1
        })

        const atom2     = graph.identifier(function * () {
            return (yield atom1) + 1
        })

        const atom3     = graph.identifier(function * () {
            return (yield atom0) + (yield atom2)
        })

        graph.propagate()

        t.is(graph.read(atom2), 2, "Correct result calculated for atom2")
        t.is(graph.read(atom3), 2, "Correct result calculated for atom3")

        graph.write(atom0, 1)

        graph.propagate()

        t.is(graph.read(atom2), 3, "Correct result calculated for atom2")
        t.is(graph.read(atom3), 4, "Correct result calculated for atom3")
    })


    // // t.it('Reject should clear all observed edges', async t => {
    // //     const graph : ChronoGraph       = MinimalChronoGraph.new()
    // //
    // //     const extraAtom : ChronoAtom       = graph.addNode(MinimalChronoAtom.new({
    // //         calculation : function * (proposeValue : string) {
    // //             return proposeValue !== undefined ? proposeValue : this.value
    // //         }
    // //     }))
    // //
    // //     const cycleAtom : ChronoAtom       = graph.addNode(MinimalChronoAtom.new({
    // //         calculation : function * (proposeValue : boolean) {
    // //             return proposeValue !== undefined ? proposeValue : this.value
    // //         }
    // //     }))
    // //
    // //     const atom1 : ChronoAtom       = graph.addNode(MinimalChronoAtom.new({
    // //         calculation : function * (proposeValue : number) {
    // //             return proposeValue !== undefined ? proposeValue : this.value
    // //         }
    // //     }))
    // //
    // //     const atom2 : ChronoAtom       = graph.addNode(MinimalChronoAtom.new({
    // //         calculation : function * (proposeValue : number) {
    // //             const cycle : boolean = yield cycleAtom
    // //
    // //             if (cycle) yield atom3
    // //
    // //             return proposeValue !== undefined ? proposeValue : this.value
    // //         }
    // //     }))
    // //
    // //     const atom3 : ChronoAtom       = graph.addNode(MinimalChronoAtom.new({
    // //         calculation : function * () {
    // //             const cycle : boolean = yield cycleAtom
    // //
    // //             if (cycle) yield extraAtom
    // //
    // //             return (yield atom1) + (yield atom2)
    // //         }
    // //     }))
    // //
    // //     extraAtom.put("justAnAtom")
    // //     cycleAtom.put(false)
    // //     atom1.put(1)
    // //     atom2.put(1)
    // //
    // //     await graph.propagate()
    // //
    // //     t.is(cycleAtom.get(), false, "Correct result calculated for cycle atom")
    // //     t.is(atom1.get(), 1, "Correct result calculated for atom1")
    // //     t.is(atom2.get(), 1, "Correct result calculated for atom2")
    // //     t.is(atom3.get(), 2, "Correct result calculated for atom3")
    // //
    // //     cycleAtom.put(true)
    // //
    // //     // during this propagate the `extraAtom` will go into the `observedDuringCalculation` array of the `atom3`
    // //     await graph.propagate(async effect => EffectResolutionResult.Cancel)
    // //
    // //     t.notOk(atom3.incoming.has(extraAtom), "Should not have incoming edge from `extraAtom`")
    // //
    // //     t.is(cycleAtom.get(), false, "Should not change atom")
    // //     t.is(atom1.get(), 1, "Should not change atom")
    // //     t.is(atom2.get(), 1, "Should not change atom")
    // //     t.is(atom3.get(), 2, "Should not change atom")
    // //
    // //     atom2.put(2)
    // //
    // //     // during this propagate the `observedDuringCalculation` array of the `atom3` will be set to the `incoming` property
    // //     await graph.propagate()
    // //
    // //     // the key assertion of this test
    // //     t.notOk(atom3.incoming.has(extraAtom), "Should not have incoming edge from `extraAtom`")
    // //
    // //     t.is(cycleAtom.get(), false, "Should not change atom")
    // //     t.is(atom1.get(), 1, "Should not change atom")
    // //     t.is(atom2.get(), 2, "Atom updated correctly")
    // //     t.is(atom3.get(), 3, "Atom updated correctly")
    // // })

})
