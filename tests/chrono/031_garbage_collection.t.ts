import { ChronoGraph, MinimalChronoGraph } from "../../src/chrono/Graph.js"
import { CalculatedValueGen } from "../../src/chrono/Identifier.js"
import { CalculationIterator } from "../../src/primitives/Calculation.js"

declare const StartTest : any

StartTest(t => {

    t.it('Should garbage collect unneeded revisions', async t => {
        // explicitly set that we don't track history
        const graph : ChronoGraph       = MinimalChronoGraph.new({ historyLimit : 0 })

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
        graph.propagate()

        t.is(graph.baseRevision.previous, null, "No extra revisions")

        // ----------------
        graph.write(box1, 1)

        graph.propagate()

        t.is(graph.baseRevision.previous, null, "No extra revisions")
    })


    t.it('Garbage collecting should keep data dependencies', async t => {
        // explicitly set that we don't track history
        const graph : ChronoGraph   = MinimalChronoGraph.new({ historyLimit : 0 })

        const var0      = graph.variableId('var0', 1)

        const var1      = graph.variableId('var1', 100)

        const var2      = graph.addIdentifier(CalculatedValueGen.new({
            * calculation () : CalculationIterator<number> {
                const value : number         = (yield var1) as number

                return value + 1
            }
        }))

        //------------------
        graph.propagate()

        // create a revision with `var1 -> var2` edge
        t.is(graph.read(var2), 101, 'Correct value')

        // now we create couple of throw-away revisions, which will garbage collect the revision with `var1 -> var2` edge

        //------------------
        graph.write(var0, 2)

        graph.propagate()

        //------------------
        graph.write(var0, 3)

        graph.propagate()

        // and now making sure the dependency is still alive
        //------------------
        graph.write(var1, 10)

        graph.propagate()

        t.is(graph.read(var2), 11, 'Correct value')
    })

})
