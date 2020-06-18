import { Box } from "../../src/chrono2/data/Box.js"
import { CalculableBox } from "../../src/chrono2/data/CalculableBox.js"
import { ChronoGraph } from "../../src/chrono2/Graph.js"

declare const StartTest : any

StartTest(t => {

    t.it('Should not recalculate nodes outside of affected scope', async t => {
        const box1      = new Box(0)
        const box2      = new Box(0)

        const box1p2    = new CalculableBox({
            calculation : () => box1.read() + box2.read()
        })

        const box3      = new Box(1)

        const res       = new CalculableBox({
            calculation : () => box1p2.read() + box3.read()
        })

        // dummy box to create additional outgoing edge from the box3
        const box4      = new CalculableBox({
            calculation : () => box3.read() + 1
        })

        // ----------------
        const plusSpy    = t.spyOn(box1p2, 'calculation')
        const resSpy     = t.spyOn(res, 'calculation')

        t.is(box1p2.read(), 0, "Correct result calculated")
        t.is(res.read(), 1, "Correct result calculated")

        t.expect(plusSpy).toHaveBeenCalled(1)
        t.expect(resSpy).toHaveBeenCalled(1)

        // ----------------
        plusSpy.reset()
        resSpy.reset()

        box1.write(10)

        // this will add extra edge to `box3` and set its internal `lastOutgoingTo` cache to box4
        // so the `res.read()` below will be adding extra edge
        box4.read()

        t.is(box1p2.read(), 10, "Correct result calculated")
        t.is(res.read(), 11, "Correct result calculated")

        t.expect(plusSpy).toHaveBeenCalled(1)
        t.expect(resSpy).toHaveBeenCalled(1)

        // ----------------
        plusSpy.reset()
        resSpy.reset()

        box3.write(2)

        t.is(box1p2.read(), 10, "Correct result calculated")
        t.is(res.read(), 12, "Correct result calculated")

        t.expect(plusSpy).toHaveBeenCalled(0)
        t.expect(resSpy).toHaveBeenCalled(1)
    })


    // t.it('Should eliminate unchanged subtrees', async t => {
    //     const graph : ChronoGraph       = ChronoGraph.new()
    //
    //     const i1        = graph.variableNamed('i1', 0)
    //     const i2        = graph.variableNamed('i2', 10)
    //
    //     const c1        = graph.identifierNamed('c1', function* () {
    //         return (yield i1) + (yield i2)
    //     })
    //
    //     const c2        = graph.identifierNamed('c2', function* () {
    //         return (yield i1) + (yield c1)
    //     })
    //
    //     const c3        = graph.identifierNamed('c3', function* () {
    //         return (yield c1)
    //     })
    //
    //     const c4        = graph.identifierNamed('c4', function* () {
    //         return (yield c3)
    //     })
    //
    //     const c5        = graph.identifierNamed('c5', function* () {
    //         return (yield c3)
    //     })
    //
    //     const c6        = graph.identifierNamed('c6', function* () {
    //         return (yield c5) + (yield i2)
    //     })
    //
    //     // ----------------
    //     const nodes             = [ i1, i2, c1, c2, c3, c4, c5, c6 ]
    //
    //     const spies             = nodes.map(identifier => t.spyOn(identifier, 'calculation'))
    //
    //     graph.commit()
    //
    //     t.isDeeply(nodes.map(node => node.read()), [ 0, 10, 10, 10, 10, 10, 10, 20 ], "Correct result calculated")
    //
    //     spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 1, 1, 1, 1, 1, 1 ][ index ]))
    //
    //     // ----------------
    //     spies.forEach(spy => spy.reset())
    //
    //     i1.write(5)
    //     i2.write(5)
    //
    //     graph.commit()
    //
    //     t.isDeeply(nodes.map(node => node.read()), [ 5, 5, 10, 15, 10, 10, 10, 15 ], "Correct result calculated")
    //
    //     const expectedCalls     = [ 0, 0, 1, 1, 0, 0, 0, 1 ]
    //
    //     spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled(expectedCalls[ index ]))
    // })
    //
    //
    // t.it('Should determine all potentially changed nodes', async t => {
    //     const graph : ChronoGraph       = ChronoGraph.new()
    //
    //     const atom0     = new Box(0)
    //
    //     const atom1     = new CalculableBox({
    //         calculation : function * () {
    //             return (yield atom0) + 1
    //         }
    //     })
    //
    //     const atom2     = new CalculableBox({
    //         calculation : function * () {
    //             return (yield atom1) + 1
    //         }
    //     })
    //
    //     const atom3     = new CalculableBox({
    //         calculation : function * () {
    //             return (yield atom0) + (yield atom2)
    //         }
    //     })
    //
    //     graph.commit()
    //
    //     t.is(atom2.read(), 2, "Correct result calculated for atom2")
    //     t.is(atom3.read(), 2, "Correct result calculated for atom3")
    //
    //     atom0.write(1)
    //
    //     graph.commit()
    //
    //     t.is(atom2.read(), 3, "Correct result calculated for atom2")
    //     t.is(atom3.read(), 4, "Correct result calculated for atom3")
    // })
    //
    //
    // t.it('Should preserve dependencies from eliminated subtrees #1', async t => {
    //     const graph : ChronoGraph       = ChronoGraph.new()
    //
    //     const i1        = graph.variableNamed('i1', 0)
    //     const i2        = graph.variableNamed('i2', 10)
    //
    //     const c1        = graph.identifierNamed('c1', function* () {
    //         return (yield i1) + (yield i2)
    //     })
    //
    //     const c2        = graph.identifierNamed('c2', function* () {
    //         return (yield c1) + 1
    //     })
    //
    //     const c3        = graph.identifierNamed('c3', function* () {
    //         return (yield c1) + 2
    //     })
    //
    //     // ----------------
    //     const nodes             = [ i1, i2, c1, c2, c3 ]
    //
    //     const spies             = nodes.map(identifier => t.spyOn(identifier, 'calculation'))
    //
    //     graph.commit()
    //
    //     t.isDeeply(nodes.map(node => node.read()), [ 0, 10, 10, 11, 12 ], "Correct result calculated #1")
    //
    //     spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 1, 1, 1 ][ index ]))
    //
    //     // ----------------
    //     spies.forEach(spy => spy.reset())
    //
    //     i1.write(5)
    //     i2.write(5)
    //
    //     graph.commit()
    //
    //     t.isDeeply(nodes.map(node => node.read()), [ 5, 5, 10, 11, 12 ], "Correct result calculated #2")
    //
    //     spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 1, 0, 0 ][ index ]))
    //
    //     // ----------------
    //     spies.forEach(spy => spy.reset())
    //
    //     i1.write(3)
    //     i2.write(7)
    //
    //     graph.commit()
    //
    //     t.isDeeply(nodes.map(node => node.read()), [ 3, 7, 10, 11, 12 ], "Correct result calculated #3")
    //
    //     spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 1, 0, 0 ][ index ]))
    //
    //     // ----------------
    //     spies.forEach(spy => spy.reset())
    //
    //     i1.write(7)
    //     i2.write(7)
    //
    //     graph.commit()
    //
    //     t.isDeeply(nodes.map(node => node.read()), [ 7, 7, 14, 15, 16 ], "Correct result calculated #4")
    //
    //     spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 1, 1, 1 ][ index ]))
    // })
    //
    //
    // t.it('Should preserve dependencies from eliminated subtrees #2', async t => {
    //     const graph : ChronoGraph       = ChronoGraph.new()
    //
    //     const i1        = graph.variableNamed('i1', 0)
    //     const i2        = graph.variableNamed('i2', 10)
    //     const i3        = graph.variableNamed('i3', 20)
    //
    //     const dispatcher = graph.variableNamed('d', i3)
    //
    //     const c1        = graph.identifierNamed('c1', function* () {
    //         return (yield i1) + (yield i2)
    //     })
    //
    //     const c2        = graph.identifierNamed('c2', function* () {
    //         return (yield c1) + 1
    //     })
    //
    //     const c3        = graph.identifierNamed('c3', function* () {
    //         return (yield (yield dispatcher))
    //     })
    //
    //     // ----------------
    //     const nodes             = [ i1, i2, i3, c1, c2, c3 ]
    //
    //     const spies             = nodes.map(identifier => t.spyOn(identifier, 'calculation'))
    //
    //     graph.commit()
    //
    //     t.isDeeply(nodes.map(node => node.read()), [ 0, 10, 20, 10, 11, 20 ], "Correct result calculated #1")
    //
    //     spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 0, 1, 1, 1 ][ index ]))
    //
    //     // ----------------
    //     spies.forEach(spy => spy.reset())
    //
    //     // the order of writes matters
    //     dispatcher.write(c2)
    //     i1.write(5)
    //     i2.write(5)
    //
    //     graph.commit()
    //
    //     t.isDeeply(nodes.map(node => node.read()), [ 5, 5, 20, 10, 11, 11 ], "Correct result calculated #2")
    //
    //     spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 0, 1, 0, 1 ][ index ]))
    //
    //     // ----------------
    //     spies.forEach(spy => spy.reset())
    //
    //     i1.write(7)
    //     i2.write(7)
    //
    //     graph.commit()
    //
    //     t.isDeeply(nodes.map(node => node.read()), [ 7, 7, 20, 14, 15, 15 ], "Correct result calculated #4")
    //
    //     spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 0, 1, 1, 1 ][ index ]))
    // })
    //
    //
    // t.it('Should preserve dependencies from shadowed entries #1', async t => {
    //     const graph : ChronoGraph       = ChronoGraph.new()
    //
    //     const i1        = graph.variableNamed('i1', 1)
    //     const i2        = graph.variableNamed('i2', 2)
    //     const i3        = graph.variableNamed('i3', 3)
    //
    //     const c1        = graph.identifierNamed('c1', function* () {
    //         return (yield i1) + (yield i2)
    //     })
    //
    //     const c2        = graph.identifierNamed('c2', function* () {
    //         return (yield i3) + (yield i2)
    //     })
    //
    //     // ----------------
    //     const nodes             = [ i1, i2, i3, c1, c2 ]
    //
    //     const spies             = nodes.map(identifier => t.spyOn(identifier, 'calculation'))
    //
    //     graph.commit()
    //
    //     t.isDeeply(nodes.map(node => node.read()), [ 1, 2, 3, 3, 5 ], "Correct result calculated #1")
    //
    //     spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 0, 1, 1 ][ index ]))
    //
    //     // ----------------
    //     spies.forEach(spy => spy.reset())
    //
    //     i1.write(2)
    //
    //     graph.commit()
    //
    //     t.isDeeply(nodes.map(node => node.read()), [ 2, 2, 3, 4, 5 ], "Correct result calculated #2")
    //
    //     spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 0, 1, 0 ][ index ]))
    //
    //     // ----------------
    //     spies.forEach(spy => spy.reset())
    //
    //     i2.write(3)
    //
    //     graph.commit()
    //
    //     t.isDeeply(nodes.map(node => node.read()), [ 2, 3, 3, 5, 6 ], "Correct result calculated #3")
    //
    //     spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 0, 1, 1 ][ index ]))
    // })
    //
    //
    // t.it('Should preserve dependencies from shadowed entries #2', async t => {
    //     const graph : ChronoGraph       = ChronoGraph.new()
    //
    //     const i1        = graph.variableNamed('i1', 1)
    //     const i2        = graph.variableNamed('i2', 2)
    //     const i3        = graph.variableNamed('i3', 3)
    //
    //     const dispatcher = graph.variableNamed('d', i3)
    //
    //     const c1        = graph.identifierNamed('c1', function* () {
    //         return (yield i1) + (yield i2)
    //     })
    //
    //     const c2        = graph.identifierNamed('c2', function* () {
    //         return yield (yield dispatcher)
    //     })
    //
    //     // ----------------
    //     const nodes             = [ i1, i2, i3, c1, c2 ]
    //
    //     const spies             = nodes.map(identifier => t.spyOn(identifier, 'calculation'))
    //
    //     graph.commit()
    //
    //     t.isDeeply(nodes.map(node => node.read()), [ 1, 2, 3, 3, 3 ], "Correct result calculated - step 1")
    //
    //     spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 0, 1, 1 ][ index ]))
    //
    //     // ----------------
    //     spies.forEach(spy => spy.reset())
    //
    //     i1.write(2)
    //     dispatcher.write(i2)
    //
    //     graph.commit()
    //
    //     t.isDeeply(nodes.map(node => node.read()), [ 2, 2, 3, 4, 2 ], "Correct result calculated - step 2")
    //
    //     spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 0, 1, 1 ][ index ]))
    //
    //     // ----------------
    //     spies.forEach(spy => spy.reset())
    //
    //     i1.write(3)
    //
    //     graph.commit()
    //
    //     t.isDeeply(nodes.map(node => node.read()), [ 3, 2, 3, 5, 2 ], "Correct result calculated - step 3")
    //
    //     spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 0, 1, 0 ][ index ]))
    //
    //     // ----------------
    //     spies.forEach(spy => spy.reset())
    //
    //     i2.write(3)
    //
    //     graph.commit()
    //
    //     t.isDeeply(nodes.map(node => node.read()), [ 3, 3, 3, 6, 3 ], "Correct result calculated - step 4")
    //
    //     spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 0, 1, 1 ][ index ]))
    // })
    //
    //
    // t.it('Should preserve dependencies from shadowed entries #3', async t => {
    //     const graph : ChronoGraph       = ChronoGraph.new()
    //
    //     const i1        = graph.variableNamed('i1', 0)
    //     const i2        = graph.variableNamed('i2', 1)
    //
    //     const c1        = graph.identifierNamed('c1', function* () {
    //         return (yield i1)
    //     })
    //
    //     const c2        = graph.identifierNamed('c2', function* () {
    //         return (yield i2)
    //     })
    //
    //     const c3        = graph.identifierNamed('c3', function* () {
    //         return (yield c1) + (yield c2)
    //     })
    //
    //
    //     // ----------------
    //     const nodes             = [ i1, i2, c1, c2, c3 ]
    //
    //     const spies             = nodes.map(identifier => t.spyOn(identifier, 'calculation'))
    //
    //     graph.commit()
    //
    //     t.isDeeply(nodes.map(node => node.read()), [ 0, 1, 0, 1, 1 ], "Correct result calculated - step 1")
    //
    //     spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 1, 1, 1 ][ index ]))
    //
    //     // ----------------
    //     spies.forEach(spy => spy.reset())
    //
    //     i2.write(2)
    //
    //     graph.commit()
    //
    //     t.isDeeply(nodes.map(node => node.read()), [ 0, 2, 0, 2, 2 ], "Correct result calculated - step 2")
    //
    //     spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 0, 1, 1 ][ index ]))
    //
    //     // ----------------
    //     spies.forEach(spy => spy.reset())
    //
    //     i1.write(1)
    //
    //     graph.commit()
    //
    //     t.isDeeply(nodes.map(node => node.read()), [ 1, 2, 1, 2, 3 ], "Correct result calculated - step 3")
    //
    //     spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 0, 1, 0, 1 ][ index ]))
    // })
    //
    //
    // t.it('Should be smart about counting incoming edges from different walk epoch', async t => {
    //     const graph : ChronoGraph       = ChronoGraph.new()
    //
    //     const i1        = graph.variableNamed('i1', 0)
    //     const i2        = graph.variableNamed('i2', 10)
    //     const i3        = graph.variableNamed('i3', 0)
    //
    //     const c1        = graph.identifierNamed('c1', function* () {
    //         return (yield i1) + (yield i2)
    //     })
    //
    //     const c2        = graph.identifierNamed('c2', function* () {
    //         return (yield c1) + 1
    //     })
    //
    //     const c3        = graph.identifierNamed('c3', function* () {
    //         return (yield c2) + (yield i3)
    //     })
    //
    //     graph.commit()
    //
    //     // ----------------
    //     const nodes             = [ i1, i2, i3, c1, c2, c3 ]
    //
    //     t.isDeeply(nodes.map(node => node.read()), [ 0, 10, 0, 10, 11, 11 ], "Correct result calculated #1")
    //
    //     // ----------------
    //     // these writes will give `c3` entry `edgesFlow` 1
    //     i1.write(5)
    //     i2.write(5)
    //
    //     // this will bump the walk epoch
    //     t.is(c1.read(), 10, 'Correct value')
    //
    //     // this write will give `c3` entry +1 to edge flow, but in another epoch, so if we clear the `edgesFlow` on new epoch
    //     // the total flow will be 1, and `c3` quark would be eliminated when `c2` did not change
    //     // we were clearing the edgeFlow on epoch change, however this is a counter-example for such clearing
    //     // TODO needs some proper solution for edgesFlow + walk epoch combination
    //     i3.write(1)
    //
    //     t.isDeeply(nodes.map(node => node.read()), [ 5, 5, 1, 10, 11, 12 ], "Correct result calculated #2")
    // })
    //
    //
    // t.it('Should ignore eliminated quarks from previous calculations, which still remains in stack', async t => {
    //     const graph : ChronoGraph       = ChronoGraph.new()
    //
    //     const i1        = graph.variableNamed('i1', 0)
    //     const i2        = graph.variableNamed('i2', 10)
    //     const i3        = graph.variableNamed('i3', 0)
    //
    //     const c1        = graph.identifierNamed('c1', function* () {
    //         return (yield i1) + (yield i2)
    //     })
    //
    //     const c2        = graph.identifierNamed('c2', function* () {
    //         return (yield c1) + 1
    //     })
    //
    //     const c3        = graph.identifierNamed('c3', function* () {
    //         return (yield c2) + 1
    //     })
    //
    //     graph.commit()
    //
    //     // ----------------
    //     const nodes             = [ i1, i2, i3, c1, c2, c3 ]
    //
    //     t.isDeeply(nodes.map(node => node.read()), [ 0, 10, 0, 10, 11, 12 ], "Correct result calculated #1")
    //
    //     // ----------------
    //     // these writes will create an entry for `c3`
    //     i1.write(5)
    //     i2.write(5)
    //     i3.write(1)
    //
    //     // this read will eliminate the entry for `c3` w/o computing it, since its only dependency `c2` didn't change
    //     // but, it will remain in the stack, with edgesFlow < 0
    //     // thus, at some point it will be processed by the transaction, possibly eliminating the "real" `c3` entry created
    //     // by the following write
    //     t.is(c3.read(), 12, 'Correct value')
    //
    //     i2.write(4)
    //
    //     graph.commit()
    //
    //     t.isDeeply(nodes.map(node => node.read()), [ 5, 4, 1, 9, 10, 11 ], "Correct result calculated #2")
    // })

})
