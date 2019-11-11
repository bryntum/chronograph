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


    t.it('Should eliminate unchanged subtrees', async t => {
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

        const spies             = nodes.map(identifier => t.spyOn(identifier, 'calculation'))

        graph.propagate()

        t.isDeeply(nodes.map(node => graph.read(node)), [ 0, 10, 10, 10, 10, 10, 10, 20 ], "Correct result calculated")

        spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 1, 1, 1, 1, 1, 1 ][ index ]))

        // ----------------
        spies.forEach(spy => spy.reset())

        graph.write(i1, 5)
        graph.write(i2, 5)

        graph.propagate()

        t.isDeeply(nodes.map(node => graph.read(node)), [ 5, 5, 10, 15, 10, 10, 10, 15 ], "Correct result calculated")

        const expectedCalls     = [ 0, 0, 1, 1, 0, 0, 0, 1 ]

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


    t.it('Should preserve dependencies from eliminated subtrees #1', async t => {
        const graph : ChronoGraph       = MinimalChronoGraph.new()

        const i1        = graph.variableId('i1', 0)
        const i2        = graph.variableId('i2', 10)

        const c1        = graph.identifierId('c1', function* () {
            return (yield i1) + (yield i2)
        })

        const c2        = graph.identifierId('c2', function* () {
            return (yield c1) + 1
        })

        const c3        = graph.identifierId('c3', function* () {
            return (yield c1) + 2
        })

        // ----------------
        const nodes             = [ i1, i2, c1, c2, c3 ]

        const spies             = nodes.map(identifier => t.spyOn(identifier, 'calculation'))

        graph.propagate()

        t.isDeeply(nodes.map(node => graph.read(node)), [ 0, 10, 10, 11, 12 ], "Correct result calculated #1")

        spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 1, 1, 1 ][ index ]))

        // ----------------
        spies.forEach(spy => spy.reset())

        graph.write(i1, 5)
        graph.write(i2, 5)

        graph.propagate()

        t.isDeeply(nodes.map(node => graph.read(node)), [ 5, 5, 10, 11, 12 ], "Correct result calculated #2")

        spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 1, 0, 0 ][ index ]))

        // ----------------
        spies.forEach(spy => spy.reset())

        graph.write(i1, 3)
        graph.write(i2, 7)

        graph.propagate()

        t.isDeeply(nodes.map(node => graph.read(node)), [ 3, 7, 10, 11, 12 ], "Correct result calculated #3")

        spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 1, 0, 0 ][ index ]))

        // ----------------
        spies.forEach(spy => spy.reset())

        graph.write(i1, 7)
        graph.write(i2, 7)

        graph.propagate()

        t.isDeeply(nodes.map(node => graph.read(node)), [ 7, 7, 14, 15, 16 ], "Correct result calculated #4")

        spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 1, 1, 1 ][ index ]))
    })


    t.it('Should preserve dependencies from eliminated subtrees #2', async t => {
        const graph : ChronoGraph       = MinimalChronoGraph.new()

        const i1        = graph.variableId('i1', 0)
        const i2        = graph.variableId('i2', 10)
        const i3        = graph.variableId('i3', 20)

        const dispatcher = graph.variableId('d', i3)

        const c1        = graph.identifierId('c1', function* () {
            return (yield i1) + (yield i2)
        })

        const c2        = graph.identifierId('c2', function* () {
            return (yield c1) + 1
        })

        const c3        = graph.identifierId('c3', function* () {
            return (yield (yield dispatcher))
        })

        // ----------------
        const nodes             = [ i1, i2, i3, c1, c2, c3 ]

        const spies             = nodes.map(identifier => t.spyOn(identifier, 'calculation'))

        graph.propagate()

        t.isDeeply(nodes.map(node => graph.read(node)), [ 0, 10, 20, 10, 11, 20 ], "Correct result calculated #1")

        spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 0, 1, 1, 1 ][ index ]))

        // ----------------
        spies.forEach(spy => spy.reset())

        // the order of writes matters
        graph.write(dispatcher, c2)
        graph.write(i1, 5)
        graph.write(i2, 5)

        graph.propagate()

        t.isDeeply(nodes.map(node => graph.read(node)), [ 5, 5, 20, 10, 11, 11 ], "Correct result calculated #2")

        spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 0, 1, 0, 1 ][ index ]))

        // ----------------
        spies.forEach(spy => spy.reset())

        graph.write(i1, 7)
        graph.write(i2, 7)

        graph.propagate()

        t.isDeeply(nodes.map(node => graph.read(node)), [ 7, 7, 20, 14, 15, 15 ], "Correct result calculated #4")

        spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 0, 1, 1, 1 ][ index ]))
    })


    t.it('Should preserve dependencies from shadowed entries #1', async t => {
        const graph : ChronoGraph       = MinimalChronoGraph.new()

        const i1        = graph.variableId('i1', 1)
        const i2        = graph.variableId('i2', 2)
        const i3        = graph.variableId('i3', 3)

        const c1        = graph.identifierId('c1', function* () {
            return (yield i1) + (yield i2)
        })

        const c2        = graph.identifierId('c2', function* () {
            return (yield i3) + (yield i2)
        })

        // ----------------
        const nodes             = [ i1, i2, i3, c1, c2 ]

        const spies             = nodes.map(identifier => t.spyOn(identifier, 'calculation'))

        graph.propagate()

        t.isDeeply(nodes.map(node => graph.read(node)), [ 1, 2, 3, 3, 5 ], "Correct result calculated")

        spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 0, 1, 1 ][ index ]))

        // ----------------
        spies.forEach(spy => spy.reset())

        graph.write(i1, 2)

        graph.propagate()

        t.isDeeply(nodes.map(node => graph.read(node)), [ 2, 2, 3, 4, 5 ], "Correct result calculated")

        spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 0, 1, 0 ][ index ]))

        // ----------------
        spies.forEach(spy => spy.reset())

        graph.write(i2, 3)

        graph.propagate()

        t.isDeeply(nodes.map(node => graph.read(node)), [ 2, 3, 3, 5, 6 ], "Correct result calculated")

        spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 0, 1, 1 ][ index ]))
    })


    t.it('Should preserve dependencies from shadowed entries #2', async t => {
        const graph : ChronoGraph       = MinimalChronoGraph.new()

        const i1        = graph.variableId('i1', 1)
        const i2        = graph.variableId('i2', 2)
        const i3        = graph.variableId('i3', 3)

        const dispatcher = graph.variableId('d', i3)

        const c1        = graph.identifierId('c1', function* () {
            return (yield i1) + (yield i2)
        })

        const c2        = graph.identifierId('c2', function* () {
            return yield (yield dispatcher)
        })

        // ----------------
        const nodes             = [ i1, i2, i3, c1, c2 ]

        const spies             = nodes.map(identifier => t.spyOn(identifier, 'calculation'))

        graph.propagate()

        t.isDeeply(nodes.map(node => graph.read(node)), [ 1, 2, 3, 3, 3 ], "Correct result calculated - step 1")

        spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 0, 1, 1 ][ index ]))

        // ----------------
        spies.forEach(spy => spy.reset())

        graph.write(i1, 2)
        graph.write(dispatcher, i2)

        graph.propagate()

        t.isDeeply(nodes.map(node => graph.read(node)), [ 2, 2, 3, 4, 2 ], "Correct result calculated - step 2")

        spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 0, 1, 1 ][ index ]))

        // ----------------
        spies.forEach(spy => spy.reset())

        graph.write(i1, 3)

        graph.propagate()

        t.isDeeply(nodes.map(node => graph.read(node)), [ 3, 2, 3, 5, 2 ], "Correct result calculated - step 3")

        spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 0, 1, 0 ][ index ]))

        // ----------------
        spies.forEach(spy => spy.reset())

        graph.write(i2, 3)

        graph.propagate()

        t.isDeeply(nodes.map(node => graph.read(node)), [ 3, 3, 3, 6, 3 ], "Correct result calculated - step 4")

        spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 0, 1, 1 ][ index ]))
    })

})
