import { Box } from "../../src/chrono2/data/Box.js"
import { CalculableBox } from "../../src/chrono2/data/CalculableBox.js"

declare const StartTest : any

StartTest(t => {

    t.it('Newly created ChronoBoxAtom should return `null` on read', t => {
        const box     = new Box()

        t.isStrict(box.read(), null)
    })


    t.it('Should read your own writes', t => {
        const box     = new Box<number>()

        box.write(10)

        t.is(box.read(), 10)

        box.write(11)
        box.write(12)

        t.is(box.read(), 12)
    })


    t.it('Writing `undefined` should be converted to `null`', t => {
        const box     = new Box<number>()

        box.write(10)

        t.is(box.read(), 10)

        box.write(undefined)

        t.isStrict(box.read(), null)
    })


    t.it('Should be possible to calculate the value of the box', t => {
        const context = {}

        const box     = new CalculableBox<number>({
            calculation : function () {
                t.is(this, context, 'Correct context')
                return 11
            },
            context
        })

        t.is(box.read(), 11)
    })


    t.it('Should be possible to calculate the value of the box', t => {
        const context = {}

        const box     = new CalculableBox<number>({
            calculation : function () {
                t.is(this, context, 'Correct context')
                return 11
            },
            context
        })

        t.is(box.read(), 11)
    })


    t.iit("Should be possible to reactively observe the value of the box in calculable box", t => {
        const box1     = new Box<number>()

        box1.write(10)

        const box2     = new CalculableBox<number>({
            calculation : () => box1.read() + 1
        })

        t.is(box2.read(), 11)

        box1.write(20)

        t.is(box2.read(), 21)
    })


    t.iit("Should be possible to reactively observe the value of the calculable box in another calculable box", t => {
        const box1     = new Box<number>()

        box1.write(10)

        const box2     = new CalculableBox<number>({
            calculation : () => box1.read() + 1
        })

        const box3     = new CalculableBox<number>({
            calculation : () => box2.read() + 1
        })

        t.is(box2.read(), 11)
        t.is(box3.read(), 12)

        box1.write(20)

        t.is(box2.read(), 21)
        t.is(box3.read(), 22)
    })


    //
    // t.it('Observe calculation in generator calculation', async t => {
    //     const graph : ChronoGraph = ChronoGraph.new()
    //
    //     const var1      = graph.variable(0)
    //     const var2      = graph.variable(1)
    //
    //     const iden1     = graph.identifier(function* () {
    //         return (yield var1) + (yield var2)
    //     })
    //
    //     const iden2     = graph.identifier(function* () {
    //         return (yield iden1) + 1
    //     })
    //
    //     t.is(graph.read(iden1), 1, 'Correct value')
    //     t.is(graph.read(iden2), 2, 'Correct value')
    //
    //     graph.write(var1, 1)
    //
    //     t.is(graph.read(iden1), 2, 'Correct value')
    //     t.is(graph.read(iden2), 3, 'Correct value')
    //
    //     graph.write(var2, 2)
    //
    //     t.is(graph.read(iden1), 3, 'Correct value')
    //     t.is(graph.read(iden2), 4, 'Correct value')
    // })
    //
    //
    // t.it('Observe calculation in synchronous calculation', async t => {
    //     const graph : ChronoGraph = ChronoGraph.new()
    //
    //     const var1      = graph.variable(0)
    //     const var2      = graph.variable(1)
    //
    //     const iden1     = graph.identifier(function (YIELD) {
    //         return YIELD(var1) + YIELD(var2)
    //     })
    //
    //     const iden2     = graph.identifier(function (YIELD) {
    //         return YIELD(iden1) + 1
    //     })
    //
    //     t.is(graph.read(iden1), 1, 'Correct value')
    //     t.is(graph.read(iden2), 2, 'Correct value')
    //
    //     graph.write(var1, 1)
    //
    //     t.is(graph.read(iden1), 2, 'Correct value')
    //     t.is(graph.read(iden2), 3, 'Correct value')
    //
    //     graph.write(var2, 2)
    //
    //     t.is(graph.read(iden1), 3, 'Correct value')
    //     t.is(graph.read(iden2), 4, 'Correct value')
    // })
    //
    //
    // t.it('Observe mixed calculation', async t => {
    //     const graph : ChronoGraph = ChronoGraph.new()
    //
    //     const var1      = graph.variable(0)
    //     const var2      = graph.variable(1)
    //
    //     const iden1     = graph.identifier(function (YIELD) {
    //         return YIELD(var1) + YIELD(var2)
    //     })
    //
    //     const iden2     = graph.identifier(function* () {
    //         return (yield iden1) + 1
    //     })
    //
    //     const iden3     = graph.identifier(function (YIELD) {
    //         return YIELD(iden2) + YIELD(var1)
    //     })
    //
    //     t.is(graph.read(iden1), 1, 'Correct value')
    //     t.is(graph.read(iden2), 2, 'Correct value')
    //     t.is(graph.read(iden3), 2, 'Correct value')
    //
    //     graph.write(var1, 1)
    //
    //     t.is(graph.read(iden1), 2, 'Correct value')
    //     t.is(graph.read(iden2), 3, 'Correct value')
    //     t.is(graph.read(iden3), 4, 'Correct value')
    //
    //     graph.write(var2, 2)
    //
    //     t.is(graph.read(iden1), 3, 'Correct value')
    //     t.is(graph.read(iden2), 4, 'Correct value')
    //     t.is(graph.read(iden3), 5, 'Correct value')
    // })
    //
    //
    // t.it('`undefined` as a result of calculation is converted to `null`', async t => {
    //     const graph : ChronoGraph = ChronoGraph.new()
    //
    //     const var1      = graph.variable(undefined)
    //
    //     const iden1     = graph.identifier(function () {
    //         return undefined
    //     })
    //
    //     const iden2     = graph.identifier(function * () {
    //         return undefined
    //     })
    //
    //     t.isStrict(graph.read(var1), null, 'Undefined normalized to `null` in variable')
    //     t.isStrict(graph.read(iden1), null, 'Undefined normalized to `null` in sync identifier')
    //     t.isStrict(graph.read(iden2), null, 'Undefined normalized to `null` in gen identifier')
    // })
    //
    //
    // t.it('Adding already added identifier should not overwrite the initial proposed value', async t => {
    //     const graph : ChronoGraph = ChronoGraph.new()
    //
    //     const iden1     = graph.addIdentifier(CalculatedValueSync.new({
    //         calculation : function (YIELD) {
    //             return YIELD(ProposedOrPrevious)
    //         }
    //     }), 10)
    //
    //     const iden11    = graph.addIdentifier(iden1)
    //
    //     t.isStrict(iden1, iden11, 'Do not overwrite the already added identifier')
    //
    //     t.is(graph.read(iden1), 10, 'Initial proposed value was not overwritten')
    // })
    //
    //
    // t.it('Should throw error on cyclic computation', async t => {
    //     const graph : ChronoGraph = ChronoGraph.new()
    //
    //     const iden1     = graph.identifier(function (Y) {
    //         return Y(iden2)
    //     })
    //
    //     const iden2     = graph.identifier(function (Y) {
    //         return Y(iden1)
    //     })
    //
    //     t.throwsOk(() => graph.read(iden1), 'Cycle')
    // })
    //
    //
    // t.it('Should throw error on cyclic computation', async t => {
    //     const graph : ChronoGraph = ChronoGraph.new()
    //
    //     const iden1     = graph.identifier(function* (Y) {
    //         return yield iden2
    //     })
    //
    //     const iden2     = graph.identifier(function* (Y) {
    //         return yield iden1
    //     })
    //
    //     t.throwsOk(() => graph.read(iden1), 'Computation cycle')
    // })


})
