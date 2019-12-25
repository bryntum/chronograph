import { ProposedOrCurrent } from "../../src/chrono/Effect.js"
import { ChronoGraph } from "../../src/chrono/Graph.js"
import { CalculatedValueGen, CalculatedValueSync, Variable } from "../../src/chrono/Identifier.js"

declare const StartTest : any

StartTest(t => {

    t.it('Observe unknown identifier', async t => {
        const graph : ChronoGraph   = ChronoGraph.new()

        const var1      = graph.variable(0)

        t.throwsOk(() => graph.read(var1), 'Unknown identifier')
    })


    t.it('Observe unknown identifier in calculation', async t => {
        const graph : ChronoGraph   = ChronoGraph.new()

        const var1      = Variable.new({ name : 'var1' })

        const iden1     = graph.identifier(function * () {
            yield var1
        })

        t.throwsOk(() => graph.propagate(), 'Unknown identifier')
    })


    t.it('Observe variable', async t => {
        const graph : ChronoGraph   = ChronoGraph.new()

        const var1      = graph.variable(0)

        graph.propagate()

        t.is(graph.read(var1), 0, 'Correct value')


        graph.write(var1, 1)

        graph.propagate()

        t.isDeeply(graph.read(var1), 1, 'Correct value')
    })


    t.it('Observe generator calculation result', async t => {
        const graph : ChronoGraph   = ChronoGraph.new()

        const iden1     = graph.identifier(function * () {
            return 1
        })

        graph.propagate()

        t.isDeeply(graph.read(iden1), 1, 'Correct value')
    })


    t.it('Observe synchronous calculation result', async t => {
        const graph : ChronoGraph   = ChronoGraph.new()

        const iden1     = graph.addIdentifier(CalculatedValueSync.new({
            calculation : function () {
                return 1
            }
        }))

        graph.propagate()

        t.isDeeply(graph.read(iden1), 1, 'Correct value')
    })


    t.it('Observe variable in generator calculation', async t => {
        const graph : ChronoGraph   = ChronoGraph.new()

        const var1      = graph.variableNamed('variable', 0)

        const iden1     = graph.identifierNamed('identifier', function * () {
            return yield var1
        })

        graph.propagate()

        t.isDeeply(graph.read(var1), 0, 'Correct value')
        t.isDeeply(graph.read(iden1), 0, 'Correct value')

        graph.write(var1, 1)

        graph.propagate()

        t.isDeeply(graph.read(var1), 1, 'Correct value')
        t.isDeeply(graph.read(iden1), 1, 'Correct value')
    })


    t.it('Observe variable in synchronous calculation', async t => {
        const graph : ChronoGraph   = ChronoGraph.new()

        const var1      = graph.variable(0)

        const iden1     = graph.addIdentifier(CalculatedValueSync.new({
            calculation : function (YIELD) {
                return YIELD(var1)
            }
        }))

        graph.propagate()

        t.isDeeply(graph.read(var1), 0, 'Correct value')
        t.isDeeply(graph.read(iden1), 0, 'Correct value')

        graph.write(var1, 1)

        graph.propagate()

        t.isDeeply(graph.read(var1), 1, 'Correct value')
        t.isDeeply(graph.read(iden1), 1, 'Correct value')
    })


    t.it('Observe calculation in generator calculation', async t => {
        const graph : ChronoGraph = ChronoGraph.new()

        const var1      = graph.variable(0)
        const var2      = graph.variable(1)

        const iden1     = graph.identifier(function* () {
            return (yield var1) + (yield var2)
        })

        const iden2     = graph.identifier(function* () {
            return (yield iden1) + 1
        })


        graph.propagate()

        t.is(graph.read(iden1), 1, 'Correct value')
        t.is(graph.read(iden2), 2, 'Correct value')

        graph.write(var1, 1)

        graph.propagate()

        t.is(graph.read(iden1), 2, 'Correct value')
        t.is(graph.read(iden2), 3, 'Correct value')

        graph.write(var2, 2)

        graph.propagate()

        t.is(graph.read(iden1), 3, 'Correct value')
        t.is(graph.read(iden2), 4, 'Correct value')
    })


    t.it('Observe calculation in synchronous calculation', async t => {
        const graph : ChronoGraph = ChronoGraph.new()

        const var1      = graph.variable(0)
        const var2      = graph.variable(1)

        const iden1     = graph.addIdentifier(CalculatedValueSync.new({
            calculation : function (YIELD) {
                return YIELD(var1) + YIELD(var2)
            }
        }))

        const iden2     = graph.addIdentifier(CalculatedValueSync.new({
            calculation : function (YIELD) {
                return YIELD(iden1) + 1
            }
        }))

        graph.propagate()

        t.is(graph.read(iden1), 1, 'Correct value')
        t.is(graph.read(iden2), 2, 'Correct value')

        graph.write(var1, 1)

        graph.propagate()

        t.is(graph.read(iden1), 2, 'Correct value')
        t.is(graph.read(iden2), 3, 'Correct value')

        graph.write(var2, 2)

        graph.propagate()

        t.is(graph.read(iden1), 3, 'Correct value')
        t.is(graph.read(iden2), 4, 'Correct value')
    })


    t.it('Observe mixed calculation', async t => {
        const graph : ChronoGraph = ChronoGraph.new()

        const var1      = graph.variable(0)
        const var2      = graph.variable(1)

        const iden1     = graph.addIdentifier(CalculatedValueSync.new({
            calculation : function (YIELD) {
                return YIELD(var1) + YIELD(var2)
            }
        }))

        const iden2     = graph.identifier(function* () {
            return (yield iden1) + 1
        })

        const iden3     = graph.addIdentifier(CalculatedValueSync.new({
            calculation : function (YIELD) {
                return YIELD(iden2) + YIELD(var1)
            }
        }))

        graph.propagate()

        t.is(graph.read(iden1), 1, 'Correct value')
        t.is(graph.read(iden2), 2, 'Correct value')
        t.is(graph.read(iden3), 2, 'Correct value')

        graph.write(var1, 1)

        graph.propagate()

        t.is(graph.read(iden1), 2, 'Correct value')
        t.is(graph.read(iden2), 3, 'Correct value')
        t.is(graph.read(iden3), 4, 'Correct value')

        graph.write(var2, 2)

        graph.propagate()

        t.is(graph.read(iden1), 3, 'Correct value')
        t.is(graph.read(iden2), 4, 'Correct value')
        t.is(graph.read(iden3), 5, 'Correct value')
    })


    t.it('`undefined` as a result of calculation is converted to `null`', async t => {
        const graph : ChronoGraph = ChronoGraph.new()

        const var1      = graph.variable(undefined)

        const iden1     = graph.addIdentifier(CalculatedValueSync.new({
            calculation : function () {
                return undefined
            }
        }))

        const iden2     = graph.addIdentifier(CalculatedValueGen.new({
            calculation : function * () {
                return undefined
            }
        }))

        graph.propagate()

        t.isStrict(graph.read(var1), null, 'Undefined normalized to `null` in variable')
        t.isStrict(graph.read(iden1), null, 'Undefined normalized to `null` in sync identifier')
        t.isStrict(graph.read(iden2), null, 'Undefined normalized to `null` in gen identifier')
    })


    t.it('Adding already added identifier should not overwrite the initial proposed value', async t => {
        const graph : ChronoGraph = ChronoGraph.new()

        const iden1     = graph.addIdentifier(CalculatedValueSync.new({
            calculation : function (YIELD) {
                return YIELD(ProposedOrCurrent)
            }
        }), 10)

        const iden11    = graph.addIdentifier(iden1)

        t.isStrict(iden1, iden11, 'Do not overwrite the already added identifier')

        graph.propagate()

        t.is(graph.read(iden1), 10, 'Initial proposed value was not overwritten')
    })
})
