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

        t.isDeeply(var1.read(), 0, 'Correct initial value')

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


    t.it('Should use atoms from branch in formulas', async t => {
        const graph1 : ChronoGraph   = ChronoGraph.new()

        let counter : number = 0

        const var1      = new Box(0)
        const var2      = new CalculableBox({
            calculation () {
                counter++

                return var1.read() + 1
            }
        })

        graph1.addAtoms([ var1, var2 ])

        t.isDeeply(var1.read(), 0, 'Correct initial value')
        t.isDeeply(var2.read(), 1, 'Correct initial value')

        t.is(counter, 1, 'Should call the calculation once')

        graph1.commit()

        //-------------------
        counter         = 0

        const graph2    = graph1.branch()

        const var1$     = graph2.checkout(var1)
        const var2$     = graph2.checkout(var2)

        t.isDeeply(var1$.read(), 0, 'Correct value initial branch value ')
        t.isDeeply(var2$.read(), 1, 'Correct value initial branch value ')

        t.is(counter, 0, 'Should not call the calculation')

        var1$.write(1)

        t.isDeeply(var1.read(), 0, 'Source graph did not change')
        t.isDeeply(var2.read(), 1, 'Source graph did not change')

        t.is(counter, 0, 'Should not call the calculation')

        t.isDeeply(var1$.read(), 1, 'Correct value in branch')
        t.isDeeply(var2$.read(), 2, 'Correct value in branch')

        t.is(counter, 1, 'Should call the calculation')

        //-------------------
        counter         = 0

        var1.write(10)

        t.isDeeply(var1.read(), 10, 'Source graph updated correctly')
        t.isDeeply(var2.read(), 11, 'Source graph updated correctly')

        t.is(counter, 1, 'Should call the calculation once - in the source graph')

        t.isDeeply(var1$.read(), 1, 'Correct value in branch')
        t.isDeeply(var2$.read(), 2, 'Correct value in branch')

        t.is(counter, 1, 'Should call the calculation once - in the source graph')
    })


    t.it('Should not recalculate nodes from previous branch', t => {
        const graph1 : ChronoGraph       = ChronoGraph.new()

        const i1            = new Box(0, 'i1')
        const i2            = new Box(1, 'i2')
        const dispatcher    = new Box(i1, 'dispatcher')

        let counter         = 0

        const c1            = new CalculableBox({
            name        : 'c1',
            calculation () {
                counter++
                return dispatcher.read().read() + 1
            }
        })

        graph1.addAtoms([ i1, i2, dispatcher, c1 ])

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => node.read()), [ 0, 1, i1, 1 ], "Correct result calculated")

        t.is(counter, 1)

        // ----------------
        counter         = 0

        const graph2    = graph1.branch()

        const dispatcher$   = graph2.checkout(dispatcher)

        dispatcher$.write(i2)

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => node.read()), [ 0, 1, i1, 1 ], "Original branch not affected")
        t.is(counter, 0)

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph2.checkout(node).read()), [ 0, 1, i2, 2 ], "Correct result calculated in new branch ")
        t.is(counter, 1)

        // ----------------
        counter         = 0

        i1.write(10)

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph2.checkout(node).read()), [ 0, 1, i2, 2 ], "Correct result calculated")
        t.is(counter, 0)

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => node.read()), [ 10, 1, i1, 11 ], "Correct result calculated")
        t.is(counter, 1)
    })


    t.it('Should not recalculate nodes from alternative branch', async t => {
        const graph1 : ChronoGraph       = ChronoGraph.new()

        const i1            = new Box(0, 'i1')
        const i2            = new Box(1, 'i2')
        const dispatcher    = new Box(i1, 'dispatcher')

        let counter         = 0

        const c1            = new CalculableBox({
            name        : 'c1',
            calculation () {
                counter++
                return dispatcher.read().read() + 1
            }
        })

        graph1.addAtoms([ i1, i2, dispatcher, c1 ])

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => node.read()), [ 0, 1, i1, 1 ], "Correct result calculated")

        t.is(counter, 1)

        // ----------------
        counter         = 0

        const graph2    = graph1.branch()

        const dispatcher$   = graph2.checkout(dispatcher)
        const i2$           = graph2.checkout(i2)

        dispatcher$.write(i2$)

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => node.read()), [ 0, 1, i1, 1 ], "Original branch not affected")
        t.is(counter, 0)

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph2.checkout(node).read()), [ 0, 1, i2$, 2 ], "Correct result calculated in new branch ")
        t.is(counter, 1)

        // ----------------
        counter         = 0

        i2$.write(10)

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => node.read()), [ 0, 1, i1, 1 ], "Correct result calculated")
        t.is(counter, 0)

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => graph2.checkout(node).read()), [ 0, 10, i2$, 11 ], "Correct result calculated")
        t.is(counter, 1)
    })


    t.it('Should not use stale deep history', async t => {
        const graph1 : ChronoGraph       = ChronoGraph.new()

        const i1            = new Box(0, 'i1')
        const i2            = new Box(1, 'i2')
        const dispatcher    = new Box(i1, 'dispatcher')

        let counter         = 0

        const c1            = new CalculableBox({
            name        : 'c1',
            calculation () {
                counter++
                return dispatcher.read().read() + 1
            }
        })

        graph1.addAtoms([ i1, i2, dispatcher, c1 ])

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => node.read()), [ 0, 1, i1, 1 ], "Correct result calculated")

        t.is(counter, 1)

        // ----------------
        dispatcher.write(i2)

        graph1.commit()

        t.is(counter, 1)

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => node.read()), [ 0, 1, i2, 2 ], "Original branch not affected")

        // ----------------
        counter = 0

        i1.write(10)

        graph1.commit()

        t.is(counter, 0)

        t.isDeeply([ i1, i2, dispatcher, c1 ].map(node => node.read()), [ 10, 1, i2, 2 ], "Correct result calculated")
    })


    t.it('Should recalculate nodes, changed in deep history', async t => {
        const graph1 : ChronoGraph       = ChronoGraph.new()

        const i1            = new Box(0, 'i1')
        const i2            = new Box(1, 'i2')

        const c1            = new CalculableBox({
            name        : 'c1',
            calculation () {
                return i1.read() + i2.read()
            }
        })

        graph1.addAtoms([ i1, i2, c1 ])

        graph1.commit()

        t.isDeeply([ i1, i2, c1 ].map(node => node.read()), [ 0, 1, 1 ], "Correct result calculated")

        // ----------------
        const graph2        = graph1.branch()

        const i3            = new Box(2, 'i3')

        graph2.addAtoms([ i3 ])

        graph2.commit()

        t.isDeeply([ i1, i2, c1, i3 ].map(node => graph2.checkout(node).read()), [ 0, 1, 1, 2 ], "Correct result calculated")

        // ----------------
        const graph3        = graph2.branch()

        graph3.checkout(i1).write(1)

        graph3.commit()

        t.isDeeply([ i1, i2, c1, i3 ].map(node => graph3.checkout(node).read()), [ 1, 1, 2, 2 ], "Correct result calculated")
    })


    t.it('Should eliminate unchanged trees, in cross-branch case', async t => {
        const graph1 : ChronoGraph       = ChronoGraph.new()

        const i1        = new Box(0, 'i1')
        const i2        = new Box(10, 'i2')

        let counter1    = 0
        let counter2    = 0
        let counter3    = 0
        let counter4    = 0
        let counter5    = 0
        let counter6    = 0

        const c1        = new CalculableBox({
            name        : 'c1',
            calculation () {
                counter1++
                return i1.read() + i2.read()
            }
        })

        const c2        = new CalculableBox({
            name        : 'c2',
            calculation () {
                counter2++
                return i1.read() + c1.read()
            }
        })

        const c3        = new CalculableBox({
            name        : 'c3',
            calculation () {
                counter3++
                return c1.read()
            }
        })

        const c4        = new CalculableBox({
            name        : 'c4',
            calculation () {
                counter4++
                return c3.read()
            }
        })

        const c5        = new CalculableBox({
            name        : 'c5',
            calculation () {
                counter5++
                return c3.read()
            }
        })

        const c6        = new CalculableBox({
            name        : 'c6',
            calculation () {
                counter6++
                return c5.read() + i2.read()
            }
        })

        // ----------------
        const nodes             = [ i1, i2, c1, c2, c3, c4, c5, c6 ]

        graph1.addAtoms(nodes)

        graph1.commit()

        t.isDeeply(nodes.map(node => node.read()), [ 0, 10, 10, 10, 10, 10, 10, 20 ], "Correct result calculated")

        t.isDeeply(
            [ counter1, counter2, counter3, counter4, counter5, counter6 ],
            [ 1,        1,        1,        1,        1,        1 ]
        )

        // ----------------
        counter1 = counter2 = counter3 = counter4 = counter5 = counter6 = 0

        const graph2            = graph1.branch()

        graph2.checkout(i1).write(5)
        graph2.checkout(i2).write(5)

        graph2.commit()

        t.isDeeply(nodes.map(node => graph2.checkout(node).read()), [ 5, 5, 10, 15, 10, 10, 10, 15 ], "Correct result calculated")

        t.isDeeply(
            [ counter1, counter2, counter3, counter4, counter5, counter6 ],
            [ 1,        1,        0,        0,        0,        1 ]
        )

        // ----------------
        counter1 = counter2 = counter3 = counter4 = counter5 = counter6 = 0

        i1.write(3)
        i2.write(7)

        graph1.commit()

        t.isDeeply(nodes.map(node => node.read()), [ 3, 7, 10, 13, 10, 10, 10, 17 ], "Correct result calculated")

        t.isDeeply(
            [ counter1, counter2, counter3, counter4, counter5, counter6 ],
            [ 1,        1,        0,        0,        0,        1 ]
        )
    })


    t.it('Should not use history from another branch', async t => {
        const graph1 : ChronoGraph       = ChronoGraph.new()

        const i1            = new Box(0, 'i1')
        const i2            = new Box(1, 'i2')
        const dispatcher    = new Box(i1, 'dispatcher')

        let counter         = 0

        const c1            = new CalculableBox({
            name        : 'c1',
            calculation () {
                counter++
                return dispatcher.read().read() + 1
            }
        })

        const nodes         = [ i1, i2, dispatcher, c1 ]

        graph1.addAtoms(nodes)

        t.isDeeply(nodes.map(node => node.read()), [ 0, 1, i1, 1 ], "Correct result calculated")

        t.is(counter, 1)

        // ----------------
        const graph2        = graph1.branch()
        const $             = node => graph2.checkout(node)

        // ----------------
        dispatcher.write(i2)

        t.isDeeply(nodes.map(node => node.read()), [ 0, 1, i2, 2 ], "Original branch not affected")

        t.is(counter, 2)

        // ----------------
        counter = 0

        $(i1).write(10)

        t.isDeeply(nodes.map(node => node.read()), [ 0, 1, i2, 2 ], "Original branch not affected")
        t.is(counter, 0)

        t.isDeeply(nodes.map(node => $(node).read()), [ 10, 1, i1, 11 ], "Correct result calculated in new branch ")
        t.is(counter, 1)
    })


})


