import { ChronoGraph, MinimalChronoGraph } from "../../src/chrono/Graph.js"
import { CalculatedValueGen, CalculatedValueSync } from "../../src/chrono/Identifier.js"
import { SyncEffectHandler } from "../../src/chrono/Transaction.js"
import { CalculationIterator } from "../../src/primitives/Calculation.js"

declare const StartTest : any

StartTest(t => {

    t.it('Should not re-entry synchronous calculations', async t => {
        const graph : ChronoGraph   = MinimalChronoGraph.new()

        const var1      = graph.variableId('v1', 1)

        let count : number = 0

        const iden1     = graph.addIdentifier(CalculatedValueSync.new({
            calculation (YIELD : SyncEffectHandler) : number {
                count++

                return YIELD(var1) + 1
            }
        }))

        const iden2     = graph.addIdentifier(CalculatedValueSync.new({
            calculation (YIELD : SyncEffectHandler) : number {
                count++

                return YIELD(iden1) + 1
            }
        }))

        const iden3     = graph.addIdentifier(CalculatedValueSync.new({
            calculation (YIELD : SyncEffectHandler) : number {
                count++

                return YIELD(iden2) + 1
            }
        }))

        graph.propagate()

        t.is(graph.read(iden1), 2, 'Correct value')
        t.is(graph.read(iden2), 3, 'Correct value')
        t.is(graph.read(iden3), 4, 'Correct value')

        t.is(count, 3, 'Calculated every identifier only once')
    })


    t.it('Should not re-entry gen calculations', async t => {
        const graph : ChronoGraph   = MinimalChronoGraph.new()

        const var1      = graph.variableId('v1', 1)

        let count : number = 0

        const iden1     = graph.addIdentifier(CalculatedValueGen.new({
            *calculation (YIELD : SyncEffectHandler) : CalculationIterator<number> {
                count++

                return (yield var1) + 1
            }
        }))

        const iden2     = graph.addIdentifier(CalculatedValueGen.new({
            *calculation (YIELD : SyncEffectHandler) : CalculationIterator<number> {
                count++

                return (yield iden1) + 1
            }
        }))

        const iden3     = graph.addIdentifier(CalculatedValueGen.new({
            *calculation (YIELD : SyncEffectHandler) : CalculationIterator<number> {
                count++

                return (yield iden2) + 1
            }
        }))

        graph.propagate()

        t.is(graph.read(iden1), 2, 'Correct value')
        t.is(graph.read(iden2), 3, 'Correct value')
        t.is(graph.read(iden3), 4, 'Correct value')

        t.is(count, 3, 'Calculated every identifier only once')
    })

})
