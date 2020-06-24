import { Box } from "../../src/chrono2/data/Box.js"
import { CalculableBox } from "../../src/chrono2/data/CalculableBox.js"
import { ChronoGraph } from "../../src/chrono2/Graph.js"

declare const StartTest : any

StartTest(t => {

    t.it('Graph branching', async t => {
        const graph1 : ChronoGraph   = ChronoGraph.new()

        const var1      = new Box(0)

        graph1.addAtom(var1)

        graph1.commit()

        t.isDeeply(var1.read(), 0, 'Correct value initial value')

        const graph2    = graph1.branch()

        const var1$     = graph2.checkout(var1)

        t.isDeeply(var1$.read(), 0, 'Correct value initial branch value ')

        var1$.write(1)

        t.isDeeply(var1.read(), 0, 'Correct value in source')
        t.isDeeply(var1$.read(), 1, 'Correct value in branch')

        var1.write(10)

        t.isDeeply(var1.read(), 10, 'Correct value in source')
        t.isDeeply(var1$.read(), 1, 'Correct value in branch')
    })


    // t.it('Should use atoms from branch in formulas', async t => {
    //     const graph1 : ChronoGraph   = ChronoGraph.new()
    //
    //     const var1      = new Box(0)
    //     const var2      = new CalculableBox({
    //         calculation () {
    //             return var1.read() + 1
    //         }
    //     })
    //
    //     graph1.addAtoms([ var1, var2 ])
    //
    //     graph1.commit()
    //
    //     t.isDeeply(var1.read(), 0, 'Correct value initial value')
    //
    //     const graph2    = graph1.branch()
    //
    //     const var1$     = graph2.checkout(var1)
    //
    //     t.isDeeply(var1$.read(), 0, 'Correct value initial branch value ')
    //
    //     var1$.write(1)
    //
    //     t.isDeeply(var1.read(), 0, 'Correct value in source')
    //     t.isDeeply(var1$.read(), 1, 'Correct value in branch')
    //
    //     var1.write(10)
    //
    //     t.isDeeply(var1.read(), 10, 'Correct value in source')
    //     t.isDeeply(var1$.read(), 1, 'Correct value in branch')
    // })

    // t.it('Should not recalculate nodes from previous branch', t => {
    //     const graph1 : ChronoGraph       = ChronoGraph.new()
    //
    //     const i1            = graph1.variableNamed('i1', 0)
    //     const i2            = graph1.variableNamed('i2', 1)
    //     const dispatcher    = graph1.variableNamed('dispatcher', i1)
    //
    //     const c1            = graph1.identifierNamed('c1', function* () {
    //         return (yield (yield dispatcher)) + 1
    //     })
    //
    //     graph1.commit()
    //
    //     t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph1.read(node)), [ 0, 1, i1, 1 ], "Correct result calculated")
    //
    //     // ----------------
    //     const graph2    = graph1.branch()
    //
    //     graph2.write(dispatcher, i2)
    //
    //     const c1Spy         = t.spyOn(c1, 'calculation')
    //
    //     graph2.commit()
    //
    //     t.expect(c1Spy).toHaveBeenCalled(1)
    //
    //     t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph1.read(node)), [ 0, 1, i1, 1 ], "Original branch not affected")
    //     t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph2.read(node)), [ 0, 1, i2, 2 ], "Correct result calculated in new branch ")
    //
    //     // ----------------
    //     c1Spy.reset()
    //
    //     graph1.write(i1, 10)
    //
    //     graph1.commit()
    //
    //     t.expect(c1Spy).toHaveBeenCalled(1)
    //
    //     t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph1.read(node)), [ 10, 1, i1, 11 ], "Correct result calculated")
    //     t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph2.read(node)), [ 0, 1, i2, 2 ], "Correct result calculated")
    // })
    //
    //
    // t.it('Should not recalculate nodes from alternative branch', async t => {
    //     const graph1 : ChronoGraph       = ChronoGraph.new()
    //
    //     const i1            = graph1.variableNamed('i1', 0)
    //     const i2            = graph1.variableNamed('i2', 1)
    //     const dispatcher    = graph1.variableNamed('dispatcher', i1)
    //
    //     const c1            = graph1.identifierNamed('c1', function* () {
    //         return (yield (yield dispatcher)) + 1
    //     })
    //
    //     graph1.commit()
    //
    //     t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph1.read(node)), [ 0, 1, i1, 1 ], "Correct result calculated")
    //
    //     // ----------------
    //     const graph2        = graph1.branch()
    //
    //     // ----------------
    //     const c1Spy         = t.spyOn(c1, 'calculation')
    //
    //     graph1.write(dispatcher, i2)
    //
    //     graph1.commit()
    //
    //     t.expect(c1Spy).toHaveBeenCalled(1)
    //
    //     t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph1.read(node)), [ 0, 1, i2, 2 ], "Original branch not affected")
    //     t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph2.read(node)), [ 0, 1, i1, 1 ], "Correct result calculated in new branch ")
    //
    //     // ----------------
    //     c1Spy.reset()
    //
    //     graph2.write(i2, 10)
    //
    //     graph2.commit()
    //
    //     t.expect(c1Spy).toHaveBeenCalled(0)
    //
    //     t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph1.read(node)), [ 0, 1, i2, 2 ], "Correct result calculated")
    //     t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph2.read(node)), [ 0, 10, i1, 1 ], "Correct result calculated")
    // })
    //
    //
    // t.it('Should not use stale deep history', async t => {
    //     const graph1 : ChronoGraph       = ChronoGraph.new()
    //
    //     const i1            = graph1.variableNamed('i1', 0)
    //     const i2            = graph1.variableNamed('i2', 1)
    //     const dispatcher    = graph1.variableNamed('dispatcher', i1)
    //
    //     const c1            = graph1.identifierNamed('c1', function* () {
    //         return (yield (yield dispatcher)) + 1
    //     })
    //
    //     graph1.commit()
    //
    //     t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph1.read(node)), [ 0, 1, i1, 1 ], "Correct result calculated")
    //
    //     // ----------------
    //     const c1Spy         = t.spyOn(c1, 'calculation')
    //
    //     graph1.write(dispatcher, i2)
    //
    //     graph1.commit()
    //
    //     t.expect(c1Spy).toHaveBeenCalled(1)
    //
    //     t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph1.read(node)), [ 0, 1, i2, 2 ], "Original branch not affected")
    //
    //     // ----------------
    //     c1Spy.reset()
    //
    //     graph1.write(i1, 10)
    //
    //     graph1.commit()
    //
    //     t.expect(c1Spy).toHaveBeenCalled(0)
    //
    //     t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph1.read(node)), [ 10, 1, i2, 2 ], "Correct result calculated")
    // })
    //
    //
    // t.it('Should recalculate nodes, changed in deep history', async t => {
    //     const graph1 : ChronoGraph       = ChronoGraph.new()
    //
    //     const i1            = graph1.variableNamed('i1', 0)
    //     const i2            = graph1.variableNamed('i2', 1)
    //
    //     const c1            = graph1.identifierNamed('c1', function* () {
    //         return (yield i1) + (yield i2)
    //     })
    //
    //     graph1.commit()
    //
    //     t.isDeeply([ i1, i2, c1 ].map(node => graph1.read(node)), [ 0, 1, 1 ], "Correct result calculated")
    //
    //     // ----------------
    //     const graph2        = graph1.branch()
    //
    //     const i3            = graph2.variableNamed('i3', 2)
    //
    //     graph2.commit()
    //
    //     t.isDeeply([ i1, i2, c1, i3 ].map(node => graph2.read(node)), [ 0, 1, 1, 2 ], "Correct result calculated")
    //
    //     // ----------------
    //     const graph3        = graph2.branch()
    //
    //     graph3.write(i1, 1)
    //
    //     graph3.commit()
    //
    //     t.isDeeply([ i1, i2, c1, i3 ].map(node => graph3.read(node)), [ 1, 1, 2, 2 ], "Correct result calculated")
    // })
    //
    //
    // t.it('Should eliminate unchanged trees, in cross-branch case', async t => {
    //     const graph1 : ChronoGraph       = ChronoGraph.new()
    //
    //     const i1        = graph1.variableNamed('i1', 0)
    //     const i2        = graph1.variableNamed('i2', 10)
    //
    //     const c1        = graph1.identifierNamed('c1', function* () {
    //         return (yield i1) + (yield i2)
    //     })
    //
    //     const c2        = graph1.identifierNamed('c2', function* () {
    //         return (yield i1) + (yield c1)
    //     })
    //
    //     const c3        = graph1.identifierNamed('c3', function* () {
    //         return (yield c1)
    //     })
    //
    //     const c4        = graph1.identifierNamed('c4', function* () {
    //         return (yield c3)
    //     })
    //
    //     const c5        = graph1.identifierNamed('c5', function* () {
    //         return (yield c3)
    //     })
    //
    //     const c6        = graph1.identifierNamed('c6', function* () {
    //         return (yield c5) + (yield i2)
    //     })
    //
    //     // ----------------
    //     const nodes             = [ i1, i2, c1, c2, c3, c4, c5, c6 ]
    //
    //     const spies             = nodes.map(calculation => t.spyOn(calculation, 'calculation'))
    //
    //     graph1.commit()
    //
    //     t.isDeeply(nodes.map(node => graph1.read(node)), [ 0, 10, 10, 10, 10, 10, 10, 20 ], "Correct result calculated")
    //
    //     spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 1, 1, 1, 1, 1, 1 ][ index ]))
    //
    //     // ----------------
    //     spies.forEach(spy => spy.reset())
    //
    //     const graph2            = graph1.branch()
    //
    //     graph2.write(i1, 5)
    //     graph2.write(i2, 5)
    //
    //     graph2.commit()
    //
    //     t.isDeeply(nodes.map(node => graph2.read(node)), [ 5, 5, 10, 15, 10, 10, 10, 15 ], "Correct result calculated")
    //
    //     spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 1, 1, 0, 0, 0, 1 ][ index ]))
    //
    //     // ----------------
    //     spies.forEach(spy => spy.reset())
    //
    //     graph1.write(i1, 3)
    //     graph1.write(i2, 7)
    //
    //     graph1.commit()
    //
    //     t.isDeeply(nodes.map(node => graph1.read(node)), [ 3, 7, 10, 13, 10, 10, 10, 17 ], "Correct result calculated")
    //
    //     spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 1, 1, 0, 0, 0, 1 ][ index ]))
    // })

})


