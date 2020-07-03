import { Box } from "../../src/chrono2/data/Box.js"
import { CalculableBox } from "../../src/chrono2/data/CalculableBox.js"
import { ChronoGraph } from "../../src/chrono2/graph/Graph.js"
import { ZeroTransaction } from "../../src/chrono2/graph/Transaction.js"

declare const StartTest : any

StartTest(t => {

    t.it('Should garbage collect unneeded revisions', async t => {
        const graph : ChronoGraph       = ChronoGraph.new({ historyLimit : 0 })

        const box1      = new Box(0)

        const box2      = new CalculableBox({
            calculation : () => box1.read() + 1
        })

        graph.addAtoms([ box1, box2 ])

        // ----------------
        graph.commit()

        t.is(graph.currentTransaction.previous.previous, undefined, "No extra revisions")

        // ----------------
        box1.write(1)

        graph.commit()

        t.is(graph.currentTransaction.previous.previous, undefined, "No extra revisions")
    })


    t.it('Should garbage collect unneeded revisions', async t => {
        const graph : ChronoGraph       = ChronoGraph.new({ historyLimit : 1 })

        const box1      = new Box(0)

        const box2      = new CalculableBox({
            calculation : () => box1.read() + 1
        })

        graph.addAtoms([ box1, box2 ])

        // ----------------
        graph.commit()

        t.is(graph.currentTransaction.previous.previous, undefined, "No extra revisions")

        // ----------------
        box1.write(1)

        graph.commit()

        t.is(graph.currentTransaction.previous.previous.previous, undefined, "No extra revisions")

        // ----------------
        box1.write(2)

        graph.commit()

        t.is(graph.currentTransaction.previous.previous.previous, undefined, "No extra revisions")
    })


    // t.it('Garbage collecting should keep data dependencies', async t => {
    //     // explicitly set that we don't track history
    //     const graph : ChronoGraph   = ChronoGraph.new({ historyLimit : 0 })
    //
    //     const var0      = graph.variableNamed('var0', 1)
    //
    //     const var1      = graph.variableNamed('var1', 100)
    //
    //     const var2      = graph.addIdentifier(CalculatedValueGen.new({
    //         * calculation () : CalculationIterator<number> {
    //             const value : number         = (yield var1) as number
    //
    //             return value + 1
    //         }
    //     }))
    //
    //     //------------------
    //     graph.commit()
    //
    //     // create a revision with `var1 -> var2` edge
    //     t.is(graph.read(var2), 101, 'Correct value')
    //
    //     // now we create couple of throw-away revisions, which will garbage collect the revision with `var1 -> var2` edge
    //
    //     //------------------
    //     graph.write(var0, 2)
    //
    //     graph.commit()
    //
    //     //------------------
    //     graph.write(var0, 3)
    //
    //     graph.commit()
    //
    //     // and now making sure the dependency is still alive
    //     //------------------
    //     graph.write(var1, 10)
    //
    //     graph.commit()
    //
    //     t.is(graph.read(var2), 11, 'Correct value')
    // })

})
