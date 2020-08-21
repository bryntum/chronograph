import { Box, BoxImmutable } from "../../src/chrono2/data/Box.js"
import { CalculableBox } from "../../src/chrono2/data/CalculableBox.js"
import { ChronoGraph } from "../../src/chrono2/graph/Graph.js"

declare const StartTest : any

StartTest(t => {

    t.it('Should not create transaction history for `historyLimit === 0`', async t => {
        const graph : ChronoGraph       = ChronoGraph.new({ historyLimit : 0 })

        const box1      = new Box(0)

        const box2      = new CalculableBox({
            calculation : () => box1.read() + 1
        })

        graph.addAtoms([ box1, box2 ])

        // ----------------
        graph.commit()

        t.is(graph.currentTransaction.previous, undefined, "No extra revisions")

        // ----------------
        box1.write(1)

        graph.commit()

        t.is(graph.currentTransaction.previous, undefined, "No extra revisions")
    })


    t.it('Should garbage collect unneeded revisions', async t => {
        const graph : ChronoGraph       = ChronoGraph.new({ historyLimit : 1 })

        const box1      = new Box(0, 'box1')

        const box2      = new CalculableBox({
            name        : 'box2',
            calculation : () => box1.read() + 1
        })

        graph.addAtoms([ box1, box2 ])

        // ----------------
        graph.commit()

        t.is(graph.currentIteration.owner, graph.currentTransaction)

        //             box1 = 0
        t.is(graph.currentTransaction.previous, undefined, "No extra revisions")
        //        box1 = 0
        t.is(box1.immutable.previous, BoxImmutable.zero, "No extra revisions")

        // ----------------
        box1.write(1)
        t.is(graph.currentIteration.owner, graph.currentTransaction)

        graph.commit()

        //             box1 = 1       box1 = 0
        t.is(graph.currentTransaction.previous.previous, undefined, "No extra revisions")
        //        box1 = 1  box1 = 0
        t.is(box1.immutable.previous.previous, BoxImmutable.zero, "No extra revisions")

        // ----------------
        box1.write(2)
        t.is(graph.currentIteration.owner, graph.currentTransaction)

        graph.commit()

        //             box1 = 2       box1 = 1
        t.is(graph.currentTransaction.previous.previous, undefined, "No extra revisions")
        //        box1 = 2  box1 = 1
        t.is(box1.immutable.previous.previous, BoxImmutable.zero, "No extra revisions")

        // ----------------
        box1.write(3)
        t.is(graph.currentIteration.owner, graph.currentTransaction)

        graph.commit()

        t.is(graph.currentTransaction.previous.previous, undefined, "No extra revisions")
        t.is(box1.immutable.previous.previous, BoxImmutable.zero, "No extra revisions")

        // ----------------
        box1.write(4)
        t.is(graph.currentIteration.owner, graph.currentTransaction)

        graph.commit()

        t.is(graph.currentTransaction.previous.previous, undefined, "No extra revisions")
        t.is(box1.immutable.previous.previous, BoxImmutable.zero, "No extra revisions")

        // ----------------
        box1.write(5)
        t.is(graph.currentIteration.owner, graph.currentTransaction)

        graph.commit()

        t.is(graph.currentTransaction.previous.previous, undefined, "No extra revisions")
        t.is(box1.immutable.previous.previous, BoxImmutable.zero, "No extra revisions")
    })


    t.it('Garbage collection should keep data dependencies', async t => {
        const graph : ChronoGraph   = ChronoGraph.new({ historyLimit : 1 })

        const var0      = new Box(1, 'var0')

        const var1      = new Box(100, 'var1')

        const var2      = new CalculableBox({
            calculation : () => var1.read() + 1
        })

        graph.addAtoms([ var0, var1, var2 ])

        //------------------
        graph.commit()

        // create a revision with `var1 -> var2` edge
        t.is(var2.read(), 101, 'Correct value')

        // now we create couple of throw-away revisions, which will garbage collect the revision with `var1 -> var2` edge

        //------------------
        var0.write(2)

        graph.commit()

        //------------------
        var0.write(3)

        graph.commit()

        // and now making sure the dependency is still alive
        //------------------
        var1.write(10)

        graph.commit()

        t.is(var2.read(), 11, 'Correct value')
    })


    t.it('Garbage collection should keep deep old data', async t => {
        const graph1 : ChronoGraph   = ChronoGraph.new({ historyLimit : 1 })

        const var0      = new Box(1, 'var0')

        const var1      = new Box(100, 'var1')

        const var2      = new CalculableBox({
            calculation : () => var1.read() + 1
        })

        const nodes         = [ var0, var1, var2 ]

        //------------------
        graph1.addAtoms(nodes)

        t.isDeeply(nodes.map(node => node.read()), [ 1, 100, 101 ], "Correct result calculated")

        graph1.commit()

        //------------------
        var1.write(200)
        graph1.commit()

        var1.write(300)
        graph1.commit()

        t.isDeeply(nodes.map(node => node.read()), [ 1, 300, 301 ], "Correct result calculated")
    })


    t.it('Garbage collection should not throw when working with branches', async t => {
        const graph1 : ChronoGraph   = ChronoGraph.new({ historyLimit : 1 })

        const var1      = new Box(100, 'var1')

        const var2      = new CalculableBox({
            name        : 'var2',
            calculation : () => var1.read() + 1
        })

        const nodes         = [ var1, var2 ]

        graph1.addAtoms(nodes)

        t.isDeeply(nodes.map(node => node.read()), [ 100, 101 ], "Correct result calculated")

        //------------------
        graph1.commit()

        const graph2        = graph1.branch({ historyLimit : 1 })
        const $             = node => graph2.checkout(node)

        t.isDeeply(nodes.map(node => $(node).read()), [ 100, 101 ], "Correct result calculated")

        //------------------
        var1.write(20)
        graph1.commit()

        var1.write(30)
        graph1.commit()

        var1.write(200)
        graph1.commit()

        var1.write(300)
        graph1.commit()

        t.isDeeply(nodes.map(node => node.read()), [ 300, 301 ], "Correct result calculated")
        t.isDeeply(nodes.map(node => $(node).read()), [ 100, 101 ], "Correct result calculated")

        //------------------
        $(var1).write(2)
        graph2.commit()

        $(var1).write(3)
        graph2.commit()

        $(var1).write(20)
        graph2.commit()

        $(var1).write(30)
        graph2.commit()

        t.isDeeply(nodes.map(node => node.read()), [ 300, 301 ], "Correct result calculated")
        t.isDeeply(nodes.map(node => $(node).read()), [ 30, 31 ], "Correct result calculated")
    })


    t.it('Garbage collection should not preserve the edges from the "same value"`" quarks', async t => {
        const graph1 : ChronoGraph   = ChronoGraph.new({ historyLimit : 0 })

        const var0      = new Box(0, 'var0')
        const var1      = new Box(10, 'var1')

        const var2      = new CalculableBox({
            name        : 'var2',
            lazy        : false,
            calculation : () => var0.read() + var1.read()
        })

        const var3      = new CalculableBox({
            name        : 'var3',
            lazy        : false,
            calculation : () => var2.read() + 1
        })

        const nodes         = [ var0, var1, var2, var3 ]

        graph1.addAtoms(nodes)

        graph1.commit()

        t.isDeeply(nodes.map(node => node.read()), [ 0, 10, 10, 11 ], "Correct result calculated")

        // in this test a several writes creates a series of "same value" quarks on `var2`
        // the outgoing edges of `var2` should be picked up from the bottom-most quark during garbage collection

        //------------------
        var0.write(1)
        var1.write(9)

        graph1.commit()

        t.isDeeply(nodes.map(node => node.read()), [ 1, 9, 10, 11 ], "Correct result calculated")

        //------------------
        var0.write(2)
        var1.write(8)

        graph1.commit()

        t.isDeeply(nodes.map(node => node.read()), [ 2, 8, 10, 11 ], "Correct result calculated")

        //------------------
        var0.write(3)
        var1.write(7)

        graph1.commit()

        t.isDeeply(nodes.map(node => node.read()), [ 3, 7, 10, 11 ], "Correct result calculated")

        //------------------
        var0.write(1)
        var1.write(1)

        graph1.commit()

        t.isDeeply(nodes.map(node => node.read()), [ 1, 1, 2, 3 ], "Correct result calculated")
    })


    // TODO
    t.xit('Garbage collection should work with branches', async t => {
        const graph1 : ChronoGraph   = ChronoGraph.new({ historyLimit : 1 })

        const var1      = new Box(100, 'var1')

        const var2      = new CalculableBox({
            name        : 'var2',
            calculation : () => var1.read() + 1
        })

        const nodes         = [ var1, var2 ]

        graph1.addAtoms(nodes)

        t.isDeeply(nodes.map(node => node.read()), [ 100, 101 ], "Correct result calculated")

        //------------------
        graph1.commit()

        const graph2        = graph1.branch({ historyLimit : 1 })
        const $             = node => graph2.checkout(node)

        t.isDeeply(nodes.map(node => $(node).read()), [ 100, 101 ], "Correct result calculated")

        //------------------
        var1.write(20)
        graph1.commit()

        var1.write(30)
        graph1.commit()

        var1.write(200)
        graph1.commit()

        var1.write(300)
        graph1.commit()

        t.isDeeply(nodes.map(node => node.read()), [ 300, 301 ], "Correct result calculated")
        t.isDeeply(nodes.map(node => $(node).read()), [ 100, 101 ], "Correct result calculated")

        t.is(graph1.currentTransaction.previous.previous, undefined, "No extra revisions")
        t.is(var1.immutable.previous.previous.previous, BoxImmutable.zero, "No extra revisions")

        //------------------
        $(var1).write(2)
        graph2.commit()

        $(var1).write(3)
        graph2.commit()

        $(var1).write(20)
        graph2.commit()

        $(var1).write(30)
        graph2.commit()

        t.isDeeply(nodes.map(node => node.read()), [ 300, 301 ], "Correct result calculated")
        t.isDeeply(nodes.map(node => $(node).read()), [ 30, 31 ], "Correct result calculated")

        t.is(graph2.currentTransaction.previous.previous, undefined, "No extra revisions")
        t.is($(var1).immutable.previous.previous.previous, BoxImmutable.zero, "No extra revisions")
    })
})
