import { ChronoGraph, MinimalChronoGraph } from "../../src/chrono/Graph.js"
import { CalculatedValueSync } from "../../src/chrono/Identifier.js"

declare const StartTest : any

StartTest(t => {

    t.it('Observe variable', async t => {
        const graph : ChronoGraph   = MinimalChronoGraph.new()

        const var1      = graph.variable(0)

        t.throwsOk(() => graph.read(var1), 'Unknown identifier')

        graph.propagate()

        t.is(graph.read(var1), 0, 'Correct value')


        graph.write(var1, 1)

        graph.propagate()

        t.isDeeply(graph.read(var1), 1, 'Correct value')
    })


    t.it('Observe generator calculation result', async t => {
        const graph : ChronoGraph   = MinimalChronoGraph.new()

        const iden1     = graph.identifier(function * () {
            return 1
        })

        graph.propagate()

        t.isDeeply(graph.read(iden1), 1, 'Correct value')
    })


    t.it('Observe synchronous calculation result', async t => {
        const graph : ChronoGraph   = MinimalChronoGraph.new()

        const iden1     = graph.addIdentifier(CalculatedValueSync.new({
            calculation : function () {
                return 1
            }
        }))

        graph.propagate()

        t.isDeeply(graph.read(iden1), 1, 'Correct value')
    })


    t.it('Observe variable in generator calculation', async t => {
        const graph : ChronoGraph   = MinimalChronoGraph.new()

        const var1      = graph.variableId('variable', 0)

        const iden1     = graph.identifierId('identifier', function * () {
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
        const graph : ChronoGraph   = MinimalChronoGraph.new()

        const var1      = graph.variable(0)

        const iden1     = graph.addIdentifier(CalculatedValueSync.new({
            calculation : function (context) {
                return context.read(var1)
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
        const graph : ChronoGraph = MinimalChronoGraph.new()

        const var1      = graph.variable(0)
        const var2      = graph.variable(1)

        const iden1     = graph.identifier(function* () {
            return ((yield var1) as number) + ((yield var2) as number)
        })

        const iden2     = graph.identifier(function* () {
            return ((yield iden1) as number) + 1
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
        const graph : ChronoGraph = MinimalChronoGraph.new()

        const var1      = graph.variable(0)
        const var2      = graph.variable(1)

        const iden1     = graph.addIdentifier(CalculatedValueSync.new({
            calculation : function (context) {
                return context.read(var1) + context.read(var2)
            }
        }))

        const iden2     = graph.addIdentifier(CalculatedValueSync.new({
            calculation : function (context) {
                return context.read(iden1) + 1
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
        const graph : ChronoGraph = MinimalChronoGraph.new()

        const var1      = graph.variable(0)
        const var2      = graph.variable(1)

        const iden1     = graph.addIdentifier(CalculatedValueSync.new({
            calculation : function (context) {
                return context.read(var1) + context.read(var2)
            }
        }))

        const iden2     = graph.identifier(function* () {
            return (yield iden1) + 1
        })

        const iden3     = graph.addIdentifier(CalculatedValueSync.new({
            calculation : function (context) {
                return context.read(iden2) + context.read(var1)
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

//     t.it('Atom as "current / observed" identity', async t => {
//         const var1      = Variable.new()
//
//         const graph : ChronoGraph   = MinimalChronoGraph.new()
//
//         const atom1     = graph.getAtom(var1)
//
//         atom1.write(0)
//         graph.propagate()
//
//         t.isDeeply(graph.readSync(var1), 0, 'Correct value')
//
//         atom1.write(1)
//         graph.propagate()
//
//         t.isDeeply(atom1.value, 1, 'Correct value')
//         t.isDeeply(graph.read(var1), 0, 'Correct value')
//
//     })
//

})
