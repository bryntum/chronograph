import { ChronoGraph } from "../../src/chrono/Graph.js"

declare const StartTest : any

StartTest(t => {

    t.it('Basic', async t => {
        const graph : ChronoGraph   = ChronoGraph.new()

        const var0      = graph.variable(0)
        const var1      = graph.variable(0)

        const iden1     = graph.identifier(function* () {
            return (yield var1) + 1
        })

        const spyListener   = t.createSpy()

        graph.addListener(iden1, spyListener)

        //-------------------
        graph.propagate()

        t.expect(spyListener).toHaveBeenCalled(1)

        t.expect(spyListener.calls.argsFor(0)).toEqual([ 1 ])

        //-------------------
        spyListener.calls.reset()

        graph.write(var1, 1)

        graph.propagate()

        t.expect(spyListener).toHaveBeenCalled(1)

        t.expect(spyListener.calls.argsFor(0)).toEqual([ 2 ])

        //-------------------
        spyListener.calls.reset()

        graph.write(var0, 1)

        graph.propagate()

        t.expect(spyListener).toHaveBeenCalled(0)
    })


    t.it('Should not trigger listener for "shadow" entries', async t => {
        const graph : ChronoGraph   = ChronoGraph.new()

        const var0      = graph.variableId('var0', 0)
        const var1      = graph.variableId('var1', 10)

        const iden1     = graph.identifierId('iden1', function* () {
            return (yield var1) + 1
        })

        const iden2     = graph.identifierId('iden2', function* () {
            return (yield iden1) + (yield var0)
        })

        const spyListener   = t.createSpy()

        graph.addListener(iden1, spyListener)

        //-------------------
        graph.propagate()

        t.expect(spyListener).toHaveBeenCalled(1)

        //-------------------
        spyListener.calls.reset()

        graph.write(var0, 1)

        // this propagate will create a "shadowing" entry for the `iden1`, containing new edges and reference to previous quark
        graph.propagate()

        t.expect(spyListener).toHaveBeenCalled(0)
    })


    t.it('Should not trigger listener for the entries with the same value', async t => {
        const graph : ChronoGraph   = ChronoGraph.new()

        const var0      = graph.variableId('var0', 0)
        const var1      = graph.variableId('var1', 10)

        const iden1     = graph.identifierId('iden1', function* () {
            return (yield var0) + (yield var1)
        })

        const spyListener   = t.createSpy()

        graph.addListener(iden1, spyListener)

        //-------------------
        graph.propagate()

        t.expect(spyListener).toHaveBeenCalled(1)

        //-------------------
        spyListener.calls.reset()

        graph.write(var0, 5)
        graph.write(var1, 5)

        // this propagate will create a "shadowing" entry for the `iden1`, containing new edges and reference to previous quark
        graph.propagate()

        t.expect(spyListener).toHaveBeenCalled(0)
    })


    t.it('Should not trigger listener after the identifier removal', async t => {
        const graph : ChronoGraph   = ChronoGraph.new()

        const var0      = graph.variableId('var0', 0)
        const var1      = graph.variableId('var1', 10)

        const iden1     = graph.identifierId('iden1', function* () {
            return (yield var0) + (yield var1)
        })

        const spyListener   = t.createSpy()

        graph.addListener(iden1, spyListener)

        //-------------------
        graph.propagate()

        t.expect(spyListener).toHaveBeenCalled(1)

        //-------------------
        spyListener.calls.reset()

        graph.removeIdentifier(iden1)

        graph.write(var0, 5)
        graph.write(var1, 5)

        graph.propagate()

        t.expect(spyListener).toHaveBeenCalled(0)
    })

})
