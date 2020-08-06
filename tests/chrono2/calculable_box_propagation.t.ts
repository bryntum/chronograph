import { setCompactCounter } from "../../src/chrono2/atom/Node.js"
import { Box } from "../../src/chrono2/data/Box.js"
import { CalculableBox } from "../../src/chrono2/data/CalculableBox.js"
import { ChronoGraph } from "../../src/chrono2/graph/Graph.js"
import { GraphGen } from "../util.js"

declare const StartTest : any

setCompactCounter(1)

StartTest(t => {

    const doTest = (t : any, graphGen : GraphGen) => {
        const prefix    = graphGen.sync ? 'SYNC: ' : 'GEN: '

        t.it(prefix + 'Should not recalculate nodes outside of affected scope', t => {
            const box1      = new Box(0)
            const box2      = new Box(0)

            const box1p2    = graphGen.calculableBox({
                calculation : eval(graphGen.calc(function* () {
                    return (yield box1) + (yield box2)
                }))
            })

            const box3      = new Box(1)

            const res       = graphGen.calculableBox({
                calculation : eval(graphGen.calc(function* () {
                    return (yield box1p2) + (yield box3)
                }))
            })

            // dummy box to create additional outgoing edge from the box3
            const box4      = graphGen.calculableBox({
                calculation : eval(graphGen.calc(function* () {
                    return (yield box3) + 1
                }))
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


        t.it(prefix + 'Should eliminate unchanged subtrees', t => {
            const i1        = new Box(0, 'i1')
            const i2        = new Box(10, 'i2')

            const c1        = graphGen.calculableBox({
                name : 'c1',
                calculation : eval(graphGen.calc(function* () {
                    return (yield i1) + (yield i2)
                }))
            })

            const c2        = graphGen.calculableBox({
                name : 'c2',
                calculation : eval(graphGen.calc(function* () {
                    return (yield i1) + (yield c1)
                }))
            })

            const c3        = graphGen.calculableBox({
                name : 'c3',
                calculation : eval(graphGen.calc(function* () {
                    return (yield c1)
                }))
            })

            const c4        = graphGen.calculableBox({
                name : 'c4',
                calculation : eval(graphGen.calc(function* () {
                    return (yield c3)
                }))
            })

            const c5        = graphGen.calculableBox({
                name : 'c5',
                calculation : eval(graphGen.calc(function* () {
                    return (yield c3)
                }))
            })

            const c6        = graphGen.calculableBox({
                name : 'c6',
                calculation : eval(graphGen.calc(function* () {
                    return (yield c5) + (yield i2)
                }))
            })

            // ----------------
            const nodes             = [ i1, i2, c1, c2, c3, c4, c5, c6 ]

            const spies             = [ c1, c2, c3, c4, c5, c6 ].map(identifier => t.spyOn(identifier, 'calculation'))

            t.isDeeply(nodes.map(node => node.read()), [ 0, 10, 10, 10, 10, 10, 10, 20 ], "Correct result calculated")

            spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 1, 1, 1, 1, 1, 1 ][ index ]))

            // ----------------
            spies.forEach(spy => spy.reset())

            i1.write(5)
            i2.write(5)

            t.isDeeply(nodes.map(node => node.read()), [ 5, 5, 10, 15, 10, 10, 10, 15 ], "Correct result calculated")

            const expectedCalls     = [ 1, 1, 0, 0, 0, 1 ]

            spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled(expectedCalls[ index ]))
        })


        t.it(prefix + 'Should eliminate unchanged subtrees #2', t => {
            const i1        = new Box(0, 'i1')
            const i2        = new Box(10, 'i2')

            const c1        = graphGen.calculableBox({
                name : 'c1',
                calculation : eval(graphGen.calc(function* () {
                    return (yield i1) + (yield i2)
                }))
            })

            const c2        = graphGen.calculableBox({
                name : 'c2',
                calculation : eval(graphGen.calc(function* () {
                    return (yield c1) + 1
                }))
            })

            const c3        = graphGen.calculableBox({
                name : 'c3',
                calculation : eval(graphGen.calc(function* () {
                    return (yield c2) + 1
                }))
            })

            // ----------------
            const nodes             = [ i1, i2, c1, c2, c3 ]

            const graph             = ChronoGraph.new({ historyLimit : 3 })

            graph.addAtoms(nodes)

            const spies             = [ c1, c2, c3 ].map(identifier => t.spyOn(identifier, 'calculation'))

            // ----------------
            t.is(c1.read(), 10)

            graph.commit()

            t.is(c2.read(), 11)

            graph.commit()

            // this read creates a new quark for `c2` which won't have the `$incoming` property
            // which needs to be read from the previous quarks
            t.is(c3.read(), 12)

            graph.commit()

            // ----------------
            spies.forEach(spy => spy.reset())

            i1.write(5)
            i2.write(5)

            t.isDeeply(nodes.map(node => node.read()), [ 5, 5, 10, 11, 12 ], "Correct result calculated")

            spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 1, 0, 0 ][ index ]))

            // ----------------
            spies.forEach(spy => spy.reset())

            i1.write(3)
            i2.write(3)

            t.isDeeply(nodes.map(node => node.read()), [ 3, 3, 6, 7, 8 ], "Correct result calculated")

            spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 1, 1, 1 ][ index ]))
        })


        t.it(prefix + 'Should determine all potentially changed nodes', t => {
            const atom0     = new Box(0, 'atom0')

            const atom1     = graphGen.calculableBox({
                name    : 'atom1',
                calculation : eval(graphGen.calc(function* () {
                    return (yield atom0) + 1
                }))
            })

            const atom2     = graphGen.calculableBox({
                name    : 'atom2',
                calculation : eval(graphGen.calc(function* () {
                    return (yield atom1) + 1
                }))
            })

            const atom3     = graphGen.calculableBox({
                name    : 'atom3',
                calculation : eval(graphGen.calc(function* () {
                    return (yield atom0) + (yield atom2)
                }))
            })

            // There's no read from `atom1` by purpose - to keep it "stale"
            t.is(atom2.read(), 2, "Correct result calculated for atom2")
            t.is(atom3.read(), 2, "Correct result calculated for atom3")

            atom0.write(1)

            // There's no read from `atom1` by purpose - to keep it "stale"
            t.is(atom2.read(), 3, "Correct result calculated for atom2")
            t.is(atom3.read(), 4, "Correct result calculated for atom3")
        })


        t.it(prefix + 'Should preserve dependencies from eliminated subtrees #1', t => {
            const i1        = new Box(0, 'i1')
            const i2        = new Box(10, 'i2')

            const c1        = graphGen.calculableBox({
                name : 'c1',
                calculation : eval(graphGen.calc(function* () {
                    return (yield i1) + (yield i2)
                }))
            })

            const c2        = graphGen.calculableBox({
                name : 'c2',
                calculation : eval(graphGen.calc(function* () {
                    return (yield c1) + 1
                }))
            })

            const c3        = graphGen.calculableBox({
                name : 'c3',
                calculation : eval(graphGen.calc(function* () {
                    return (yield c1) + 2
                }))
            })

            // ----------------
            const nodes             = [ i1, i2, c1, c2, c3 ]

            const spies             = [ c1, c2, c3 ].map(identifier => t.spyOn(identifier, 'calculation'))

            t.isDeeply(nodes.map(node => node.read()), [ 0, 10, 10, 11, 12 ], "Correct result calculated #1")

            spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 1, 1, 1 ][ index ]))

            // ----------------
            spies.forEach(spy => spy.reset())

            i1.write(5)
            i2.write(5)

            t.isDeeply(nodes.map(node => node.read()), [ 5, 5, 10, 11, 12 ], "Correct result calculated #2")

            spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 1, 0, 0 ][ index ]))

            // ----------------
            spies.forEach(spy => spy.reset())

            i1.write(3)
            i2.write(7)

            t.isDeeply(nodes.map(node => node.read()), [ 3, 7, 10, 11, 12 ], "Correct result calculated #3")

            spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 1, 0, 0 ][ index ]))

            // ----------------
            spies.forEach(spy => spy.reset())

            i1.write(7)
            i2.write(7)

            t.isDeeply(nodes.map(node => node.read()), [ 7, 7, 14, 15, 16 ], "Correct result calculated #4")

            spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 1, 1, 1 ][ index ]))
        })


        t.it(prefix + 'Should preserve dependencies from eliminated subtrees #2', t => {
            const i1        = new Box(0, 'i1')
            const i2        = new Box(10, 'i2')
            const i3        = new Box(20, 'i3')

            const dispatcher = new Box(i3, 'dispatcher')

            const c1        = graphGen.calculableBox({
                name : 'c1',
                calculation : eval(graphGen.calc(function* () {
                    return (yield i1) + (yield i2)
                }))
            })

            const c2        = graphGen.calculableBox({
                name : 'c2',
                calculation : eval(graphGen.calc(function* () {
                    return (yield c1) + 1
                })) as () => number
            })

            const c3        = graphGen.calculableBox({
                name : 'c3',
                calculation : eval(graphGen.calc(function* () {
                    const box = (yield dispatcher)
                    return (yield box)
                }))
            })

            // ----------------
            const nodes             = [ i1, i2, i3, c1, c2, c3 ]

            const spies             = [ c1, c2, c3 ].map(identifier => t.spyOn(identifier, 'calculation'))

            t.isDeeply(nodes.map(node => node.read()), [ 0, 10, 20, 10, 11, 20 ], "Correct result calculated #1")

            spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 1, 1, 1 ][ index ]))

            // ----------------
            spies.forEach(spy => spy.reset())

            // the order of writes matters
            dispatcher.write(c2)
            i1.write(5)
            i2.write(5)

            t.isDeeply(nodes.map(node => node.read()), [ 5, 5, 20, 10, 11, 11 ], "Correct result calculated #2")

            spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 1, 0, 1 ][ index ]))

            // ----------------
            spies.forEach(spy => spy.reset())

            i1.write(7)
            i2.write(7)

            t.isDeeply(nodes.map(node => node.read()), [ 7, 7, 20, 14, 15, 15 ], "Correct result calculated #4")

            spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 1, 1, 1 ][ index ]))
        })


        t.it(prefix + 'Should preserve dependencies from shadowed entries #1', t => {
            const i1        = new Box(1, 'i1')
            const i2        = new Box(2, 'i2')
            const i3        = new Box(3, 'i3')

            const c1        = graphGen.calculableBox({
                name : 'c1',
                calculation : eval(graphGen.calc(function* () {
                    return (yield i1) + (yield i2)
                }))
            })

            const c2        = graphGen.calculableBox({
                name : 'c2',
                calculation : eval(graphGen.calc(function* () {
                    return (yield i2) + (yield i3)
                }))
            })

            // ----------------
            const nodes             = [ i1, i2, i3, c1, c2 ]

            const spies             = [ c1, c2 ].map(identifier => t.spyOn(identifier, 'calculation'))

            t.isDeeply(nodes.map(node => node.read()), [ 1, 2, 3, 3, 5 ], "Correct result calculated #1")

            spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 1, 1 ][ index ]))

            // ----------------
            spies.forEach(spy => spy.reset())

            i1.write(2)

            t.isDeeply(nodes.map(node => node.read()), [ 2, 2, 3, 4, 5 ], "Correct result calculated #2")

            spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 1, 0 ][ index ]))

            // ----------------
            spies.forEach(spy => spy.reset())

            i2.write(3)

            t.isDeeply(nodes.map(node => node.read()), [ 2, 3, 3, 5, 6 ], "Correct result calculated #3")

            spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 1, 1 ][ index ]))
        })


        t.it(prefix + 'Should preserve dependencies from shadowed entries #2', t => {
            const i1        = new Box(1, 'i1')
            const i2        = new Box(2, 'i2')
            const i3        = new Box(3, 'i3')

            const dispatcher = new Box(i3, 'dispatcher')

            const c1        = graphGen.calculableBox({
                name : 'c1',
                calculation : eval(graphGen.calc(function* () {
                    return (yield i1) + (yield i2)
                }))
            })

            const c2        = graphGen.calculableBox({
                name : 'c2',
                calculation : eval(graphGen.calc(function* () {
                    const box = (yield dispatcher)
                    return (yield box)
                }))
            })

            // ----------------
            const nodes             = [ i1, i2, i3, c1, c2 ]

            const spies             = [ c1, c2 ].map(identifier => t.spyOn(identifier, 'calculation'))

            t.isDeeply(nodes.map(node => node.read()), [ 1, 2, 3, 3, 3 ], "Correct result calculated - step 1")

            spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 1, 1 ][ index ]))

            // ----------------
            spies.forEach(spy => spy.reset())

            i1.write(2)
            dispatcher.write(i2)

            t.isDeeply(nodes.map(node => node.read()), [ 2, 2, 3, 4, 2 ], "Correct result calculated - step 2")

            spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 1, 1 ][ index ]))

            // ----------------
            spies.forEach(spy => spy.reset())

            i1.write(3)

            t.isDeeply(nodes.map(node => node.read()), [ 3, 2, 3, 5, 2 ], "Correct result calculated - step 3")

            spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 1, 0 ][ index ]))

            // ----------------
            spies.forEach(spy => spy.reset())

            i2.write(3)

            t.isDeeply(nodes.map(node => node.read()), [ 3, 3, 3, 6, 3 ], "Correct result calculated - step 4")

            spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 1, 1 ][ index ]))
        })


        t.it(prefix + 'Should preserve dependencies from shadowed entries #3', t => {
            const i1        = new Box(0, 'i1')
            const i2        = new Box(1, 'i2')

            const c1        = graphGen.calculableBox({
                name : 'c1',
                calculation : eval(graphGen.calc(function* () {
                    return (yield i1)
                }))
            })

            const c2        = graphGen.calculableBox({
                name : 'c2',
                calculation : eval(graphGen.calc(function* () {
                    return (yield i2)
                }))
            })

            const c3        = graphGen.calculableBox({
                name : 'c3',
                calculation : eval(graphGen.calc(function* () {
                    return (yield c1) + (yield c2)
                }))
            })


            // ----------------
            const nodes             = [ i1, i2, c1, c2, c3 ]

            const spies             = [ c1, c2, c3 ].map(identifier => t.spyOn(identifier, 'calculation'))

            t.isDeeply(nodes.map(node => node.read()), [ 0, 1, 0, 1, 1 ], "Correct result calculated - step 1")

            spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 1, 1, 1 ][ index ]))

            // ----------------
            spies.forEach(spy => spy.reset())

            i2.write(2)

            t.isDeeply(nodes.map(node => node.read()), [ 0, 2, 0, 2, 2 ], "Correct result calculated - step 2")

            spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 0, 1, 1 ][ index ]))

            // ----------------
            spies.forEach(spy => spy.reset())

            i1.write(1)

            t.isDeeply(nodes.map(node => node.read()), [ 1, 2, 1, 2, 3 ], "Correct result calculated - step 3")

            spies.forEach((spy, index) => t.expect(spy).toHaveBeenCalled([ 1, 0, 1 ][ index ]))
        })


        t.it(prefix + 'Should be smart about counting incoming edges from different walk epoch', t => {
            const i1        = new Box(0, 'i1')
            const i2        = new Box(10, 'i2')
            const i3        = new Box(0, 'i3')

            const c1        = graphGen.calculableBox({
                name : 'c1',
                calculation : eval(graphGen.calc(function* () {
                    return (yield i1) + (yield i2)
                }))
            })

            const c2        = graphGen.calculableBox({
                name : 'c2',
                calculation : eval(graphGen.calc(function* () {
                    return (yield c1) + 1
                }))
            })

            const c3        = graphGen.calculableBox({
                name : 'c3',
                calculation : eval(graphGen.calc(function* () {
                    return (yield c2) + (yield i3)
                }))
            })

            // ----------------
            const nodes             = [ i1, i2, i3, c1, c2, c3 ]

            t.isDeeply(nodes.map(node => node.read()), [ 0, 10, 0, 10, 11, 11 ], "Correct result calculated #1")

            // ----------------
            i1.write(5)
            i2.write(5)

            t.is(c1.read(), 10, 'Correct value')

            i3.write(1)

            t.isDeeply(nodes.map(node => node.read()), [ 5, 5, 1, 10, 11, 12 ], "Correct result calculated #2")
        })


        t.it(prefix + 'Should ignore eliminated quarks from previous calculations, which still remains in stack', t => {
            const i1        = new Box(0, 'i1')
            const i2        = new Box(10, 'i2')
            const i3        = new Box(0, 'i3')

            const c1        = graphGen.calculableBox({
                name : 'c1',
                calculation : eval(graphGen.calc(function* () {
                    return (yield i1) + (yield i2)
                }))
            })

            const c2        = graphGen.calculableBox({
                name : 'c2',
                calculation : eval(graphGen.calc(function* () {
                    return (yield c1) + 1
                }))
            })

            const c3        = graphGen.calculableBox({
                name : 'c3',
                calculation : eval(graphGen.calc(function* () {
                    return (yield c2) + 1
                }))
            })

            // ----------------
            const nodes             = [ i1, i2, i3, c1, c2, c3 ]

            t.isDeeply(nodes.map(node => node.read()), [ 0, 10, 0, 10, 11, 12 ], "Correct result calculated #1")

            // ----------------
            // these writes will create an entry for `c3`
            i1.write(5)
            i2.write(5)
            i3.write(1)

            // this read will eliminate the entry for `c3` w/o computing it, since its only dependency `c2` didn't change
            // but, it will remain in the stack, with edgesFlow < 0
            // thus, at some point it will be processed by the transaction, possibly eliminating the "real" `c3` entry created
            // by the following write
            t.is(c3.read(), 12, 'Correct value')

            i2.write(4)

            t.isDeeply(nodes.map(node => node.read()), [ 5, 4, 1, 9, 10, 11 ], "Correct result calculated #2")
        })


        t.it(prefix + 'Should be able to only calculate the specified nodes', t => {
            const box1      = new Box(1)
            const box2      = new Box(2)

            const iden1     = graphGen.calculableBox({
                calculation : eval(graphGen.calc(function* () {
                    return (yield box1) + (yield box2)
                }))
            })

            const box3      = new Box(3)

            const iden2     = graphGen.calculableBox({
                calculation : eval(graphGen.calc(function* () {
                    return (yield iden1) + (yield box3)
                }))
            })

            // ----------------
            const calculation1Spy   = t.spyOn(iden1, 'calculation')
            const calculation2Spy   = t.spyOn(iden2, 'calculation')

            iden1.read()

            t.expect(calculation1Spy).toHaveBeenCalled(1)
            t.expect(calculation2Spy).toHaveBeenCalled(0)

            // ----------------
            calculation1Spy.reset()
            calculation2Spy.reset()

            t.is(iden1.read(), 3, "Correct result calculated")
            t.is(iden2.read(), 6, "Correct result calculated")

            t.expect(calculation1Spy).toHaveBeenCalled(0)
            t.expect(calculation2Spy).toHaveBeenCalled(1)
        })


        t.it(prefix + 'Should not re-entry calculations', t => {
            const graph : ChronoGraph   = ChronoGraph.new()

            const var1      = new Box(1, 'v1')

            let count : number = 0

            const iden1     = graphGen.calculableBox({
                lazy    : false,
                calculation : eval(graphGen.calc(function* () {
                    count++

                    return (yield var1) + 1
                }))
            })

            const iden2     = graphGen.calculableBox({
                lazy    : false,
                calculation : eval(graphGen.calc(function* () {
                    count++

                    return (yield iden1) + 1
                }))
            })

            const iden3     = graphGen.calculableBox({
                lazy    : false,
                calculation : eval(graphGen.calc(function* () {
                    count++

                    return (yield iden2) + 1
                }))
            })

            graph.addAtoms([ var1, iden1, iden2, iden3 ])

            graph.commit()

            t.is(iden1.read(), 2, 'Correct value')
            t.is(iden2.read(), 3, 'Correct value')
            t.is(iden3.read(), 4, 'Correct value')

            t.is(count, 3, 'Calculated every identifier only once')
        })

    }

    doTest(t, GraphGen.new({ sync : true }))
    doTest(t, GraphGen.new({ sync : false }))
})
