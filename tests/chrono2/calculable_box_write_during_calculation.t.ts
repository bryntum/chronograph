import { computed, observable } from "../../node_modules/mobx/lib/mobx.module.js"
import { ProposedOrPrevious, WriteSeveral } from "../../src/chrono/Effect.js"
import { ChronoGraph } from "../../src/chrono/Graph.js"
import { setCompactCounter } from "../../src/chrono2/atom/Node.js"
import { Box } from "../../src/chrono2/data/Box.js"
import { GraphGen } from "../util.js"

declare const StartTest : any

setCompactCounter(1)

StartTest(t => {

    const doTest = (t : any, graphGen : GraphGen) => {
        const prefix    = graphGen.sync ? 'SYNC: ' : 'GEN: '

        // t.it(prefix + "Should be possible to write to another box during calculation", t => {
        //     const var0      = observable.box(0)
        //     const var1      = observable.box(0)
        //
        //     const varMax    = observable.box(10)
        //
        //     const idenSum   = computed(function () {
        //         const sum : number  = var0.get() + var1.get()
        //
        //         const max : number  = varMax.get()
        //
        //         if (sum > max) {
        //             var0.set(var0.get() - (sum - max))
        //         }
        //
        //         return sum
        //     })
        //
        //     // const spy1      = t.spyOn(idenSum, 'calculation')
        //
        //     //-------------------
        //     t.is(idenSum.get(), 0, 'Correct value')
        //
        //     // t.expect(spy1).toHaveBeenCalled(1)
        //
        //     //-------------------
        //     // spy1.reset()
        //
        //     var0.set(5)
        //     var1.set(7)
        //
        //     t.is(idenSum.get(), 10, 'Correct value') // 12
        //     t.is(idenSum.get(), 10, 'Correct value') // 10
        //
        //     // t.expect(spy1).toHaveBeenCalled(2)
        //
        //     t.is(var0.get(), 3, 'Correct value')
        // })


        t.it(prefix + "Should be possible to write to another box during calculation", t => {
            const var0      = new Box(0, 'var0')
            const var1      = new Box(0, 'var1')

            const varMax    = new Box(10, 'varMax')

            const idenSum   = graphGen.calculableBox({
                calculation : eval(graphGen.calc(function* () {
                    const sum : number  = (yield var0) + (yield var1)

                    const max : number  = (yield varMax)

                    if (sum > max) {
                        var0.write((yield var0) - (sum - max))
                    }

                    return sum
                }))
            })

            const spy1      = t.spyOn(idenSum, 'calculation')

            //-------------------
            t.is(idenSum.read(), 0, 'Correct value')

            t.expect(spy1).toHaveBeenCalled(1)

            //-------------------
            spy1.reset()

            var0.write(5)
            var1.write(7)

            t.is(idenSum.read(), 10, 'Correct value')
            t.is(idenSum.read(), 10, 'Correct value')

            t.expect(spy1).toHaveBeenCalled(2)

            t.is(var0.read(), 3, 'Correct value')
        })


        // t.it('Subtree elimination - gen', async t => {
        //     const graph : ChronoGraph   = ChronoGraph.new()
        //
        //     const var0      = graph.variableNamed('var0', 0)
        //     const var1      = graph.variableNamed('var1', 0)
        //
        //     const iden1     = graph.identifierNamed('iden1', function* () {
        //         return (yield var0) + (yield var1)
        //     })
        //
        //     const iden2     = graph.identifierNamed('iden2', function* () {
        //         return (yield iden1) + 1
        //     })
        //
        //     const iden3     = graph.identifierNamed('iden3', function* () {
        //         const value0 : number  = yield var0
        //         const value1 : number  = yield var1
        //
        //         if (value1 > 5) {
        //             // swap the values for `var0` and `var1`
        //             yield WriteSeveral([
        //                 { identifier : var0, proposedArgs : [ value1 ] },
        //                 { identifier : var1, proposedArgs : [ value0 ] }
        //             ])
        //         }
        //
        //         return yield ProposedOrPrevious
        //     })
        //
        //
        //     const spy1      = t.spyOn(iden1, 'calculation')
        //     const spy2      = t.spyOn(iden2, 'calculation')
        //
        //     //-------------------
        //     graph.commit()
        //
        //     t.expect(spy1).toHaveBeenCalled(1)
        //     t.expect(spy2).toHaveBeenCalled(1)
        //
        //     t.is(graph.read(iden2), 1, 'Correct value')
        //
        //     //-------------------
        //     spy2.reset()
        //
        //     graph.write(var0, 5)
        //     graph.write(var1, 7)
        //
        //     graph.commit()
        //
        //     t.expect(spy1).toHaveBeenCalled(2)
        //     t.expect(spy2).toHaveBeenCalled(1)
        //
        //     t.is(graph.read(var0), 7, 'Correct value')
        //     t.is(graph.read(var1), 5, 'Correct value')
        //     t.is(graph.read(iden2), 13, 'Correct value')
        // })

    }

    doTest(t, GraphGen.new({ sync : true }))
    // doTest(t, GraphGen.new({ sync : false }))
})
