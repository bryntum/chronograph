import { ChronoGraph, MinimalChronoGraph } from "../../src/chrono/Graph.js"
import { ProposedValue, Transaction } from "../../src/chrono/Transaction.js"
import { CalculationIterator } from "../../src/primitives/Calculation.js"
import { ImpureCalculatedValueGen } from "../../src/chrono/Identifier.js"

declare const StartTest : any

StartTest(t => {

    t.it('ProposedValue - persistent', async t => {
        const graph : ChronoGraph   = MinimalChronoGraph.new()

        const var1      = graph.variableId('variable', 100)

        const var2      = graph.addIdentifier(ImpureCalculatedValueGen.new({
            * calculation () : CalculationIterator<number> {
                let proposedValue : number      = yield ProposedValue(var2)

                const max : number              = yield var1

                return proposedValue <= max ? proposedValue : max
            }
        }))

        graph.call(var2, 18)

        graph.propagate()

        t.is(graph.read(var2), 18, 'Correct value')

        //------------------
        graph.call(var2, 180)

        graph.propagate()

        t.is(graph.read(var2), 100, 'Correct value')


        //------------------
        graph.write(var1, 1000)

        graph.propagate()

        t.is(graph.read(var2), 180, 'Correct value')
    })


    // t.it('CurrentProposedValue - transient', async t => {
    //     const graph : ChronoGraph   = MinimalChronoGraph.new()
    //
    //     const var1      = graph.variableId('variable', 100)
    //
    //     const var2      = graph.addIdentifier(ImpureCalculatedValueGen.new({
    //         validate (Yield : Transaction, proposedValue : any) : CalculationIterator<number> {
    //             const max : number      = yield var1
    //
    //             return proposedValue <= max ? proposedValue : max
    //         },
    //
    //         * calculation () : CalculationIterator<number> {
    //             const dispatching = yield dispatcher
    //
    //             if (dispatching === 'recalculate') {
    //
    //             }
    //             else if (dispatching === 'use_user_input_or_keep_unchanged') {
    //                 return UseProposedOrKeepUnchanged()
    //             }
    //         },
    //
    //
    //         * calculation () : CalculationIterator<number> {
    //             const dispatching = yield dispatcher
    //
    //             if (dispatching === 'recalculate') {
    //
    //             }
    //             else if (dispatching === 'use_user_input_or_keep_unchanged') {
    //                 return yield* this.validation()
    //             }
    //         },
    //
    //
    //         * validation () : CalculationIterator<number> {
    //             let proposedValue : number      = yield TransientProposedValue()
    //
    //             const max : number      = yield var1
    //
    //             return proposedValue <= max ? proposedValue : max
    //         },
    //
    //
    //     }))
    //
    //     graph.call(var2, 18)
    //
    //     graph.propagate()
    //
    //     t.is(graph.read(var2), 18, 'Correct value')
    //
    //     //------------------
    //     graph.call(var2, 180)
    //
    //     graph.propagate()
    //
    //     t.is(graph.read(var2), 100, 'Correct value')
    //
    //
    //     //------------------
    //     graph.write(var1, 1000)
    //
    //     graph.propagate()
    //
    //     t.is(graph.read(var2), 180, 'Correct value')
    // })

})
