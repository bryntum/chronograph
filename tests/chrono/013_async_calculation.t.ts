import { ChronoGraph } from "../../src/chrono/Graph.js"
import { CalculatedValueGen } from "../../src/chrono/Identifier.js"
import { SyncEffectHandler } from "../../src/chrono/Transaction.js"
import { CalculationIterator } from "../../src/primitives/Calculation.js"
import { delay } from "../../src/util/Helpers.js"

declare const StartTest : any

StartTest(t => {

    t.it('Should not re-entry async read', async t => {
        const graph : ChronoGraph   = ChronoGraph.new()

        const var1      = graph.variableNamed('v1', 1)

        let count       = 0

        const iden1     = graph.addIdentifier(CalculatedValueGen.new({
            sync        : false,

            *calculation (YIELD : SyncEffectHandler) : CalculationIterator<number> {
                count++

                yield delay(10)

                return (yield var1) + 1
            }
        }))


        const promise1      = graph.readAsync(iden1)
        const promise2      = graph.readAsync(iden1)

        t.is(await promise1, 2, 'Correct value')
        t.is(await promise2, 2, 'Correct value')
        t.is(count, 1, 'Calculated once')
    })


    t.it('Should not re-entry async gen calculations that has been partially read already', async t => {
        const graph : ChronoGraph   = ChronoGraph.new()

        const var1      = graph.variableNamed('var1', 1)

        let count : number = 0

        const iden1     = graph.addIdentifier(CalculatedValueGen.new({
            name        : 'iden1',
            sync        : false,

            *calculation (YIELD : SyncEffectHandler) : CalculationIterator<number> {
                count++

                yield delay(10)

                return (yield var1) + 1
            }
        }))

        const iden2     = graph.addIdentifier(CalculatedValueGen.new({
            name        : 'iden2',
            sync        : false,

            *calculation (YIELD : SyncEffectHandler) : CalculationIterator<number> {
                count++

                yield delay(10)

                return (yield iden1) + 1
            }
        }))

        const iden3     = graph.addIdentifier(CalculatedValueGen.new({
            name        : 'iden3',
            sync        : false,

            *calculation (YIELD : SyncEffectHandler) : CalculationIterator<number> {
                count++

                yield delay(10)

                return (yield iden2) + 1
            }
        }))

        const promise1      = graph.readAsync(iden2)

        // t.is(graph.read(iden1), 2, 'Correct value')
        // t.is(graph.read(iden2), 3, 'Correct value')

        t.is(await graph.readAsync(iden3), 4, 'Correct value')
        // t.is(await promise1, 3, 'Correct value')

        t.is(count, 3, 'Calculated every identifier only once')
    })

})
