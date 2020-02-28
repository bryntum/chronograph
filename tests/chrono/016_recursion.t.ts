import { ProposedOrPrevious, Write, WriteSeveral } from "../../src/chrono/Effect.js"
import { ChronoGraph } from "../../src/chrono/Graph.js"

declare const StartTest : any

StartTest(t => {

    t.it('Base case - gen', async t => {
        const graph : ChronoGraph   = ChronoGraph.new()

        const var0      = graph.variableNamed('var0', 0)
        const var1      = graph.variableNamed('var1', 0)

        const varMax    = graph.variableNamed('varMax', 10)

        const idenSum   = graph.identifierNamed('idenSum', function* () {
            const sum : number  = (yield var0) + (yield var1)

            const max : number  = yield varMax

            if (sum > max) {
                yield Write(var0, (yield var0) - (sum - max))
            }

            return sum
        })

        const spy1      = t.spyOn(idenSum, 'calculation')

        //-------------------
        graph.commit()

        t.expect(spy1).toHaveBeenCalled(1)

        t.is(graph.read(idenSum), 0, 'Correct value')


        //-------------------
        spy1.reset()

        graph.write(var0, 5)
        graph.write(var1, 7)

        graph.commit()

        t.expect(spy1).toHaveBeenCalled(2)

        t.is(graph.read(idenSum), 10, 'Correct value')
        t.is(graph.read(var0), 3, 'Correct value')
    })


    t.it('Subtree elimination - gen', async t => {
        const graph : ChronoGraph   = ChronoGraph.new()

        const var0      = graph.variableNamed('var0', 0)
        const var1      = graph.variableNamed('var1', 0)

        const iden1     = graph.identifierNamed('iden1', function* () {
            return (yield var0) + (yield var1)
        })

        const iden2     = graph.identifierNamed('iden2', function* () {
            return (yield iden1) + 1
        })

        const iden3     = graph.identifierNamed('iden3', function* () {
            const value0 : number  = yield var0
            const value1 : number  = yield var1

            if (value1 > 5) {
                // swap the values for `var0` and `var1`
                yield WriteSeveral([
                    { identifier : var0, proposedArgs : [ value1 ] },
                    { identifier : var1, proposedArgs : [ value0 ] }
                ])
            }

            return yield ProposedOrPrevious
        })


        const spy1      = t.spyOn(iden1, 'calculation')
        const spy2      = t.spyOn(iden2, 'calculation')

        //-------------------
        graph.commit()

        t.expect(spy1).toHaveBeenCalled(1)
        t.expect(spy2).toHaveBeenCalled(1)

        t.is(graph.read(iden2), 1, 'Correct value')

        //-------------------
        spy2.reset()

        graph.write(var0, 5)
        graph.write(var1, 7)

        graph.commit()

        t.expect(spy1).toHaveBeenCalled(2)
        t.expect(spy2).toHaveBeenCalled(1)

        t.is(graph.read(var0), 7, 'Correct value')
        t.is(graph.read(var1), 5, 'Correct value')
        t.is(graph.read(iden2), 13, 'Correct value')
    })


    t.it('Identifier listeners + subtree elimination', async t => {
        const graph : ChronoGraph   = ChronoGraph.new()

        // const var0      = graph.variableNamed('var0', 0)
        // const var1      = graph.variableNamed('var1', 0)
        //
        // const dispatcher     = graph.addIdentifier(CalculatedValueGen.new({
        //     name        : 'disp',
        //
        //     * calculation (YIELD) : CalculationIterator<number> {
        //         const proposedValue : number    = YIELD(ProposedOrPrevious)
        //
        //         return proposedValue
        //     },
        //
        //
        // }))
        //
        // const iden1     = graph.addIdentifier(CalculatedValueGen.new({
        //     listeners   : new Set([ dispatcher ]),
        //
        //     * calculation (YIELD) : CalculationIterator<number> {
        //         const disp      = yield dispatcher
        //
        //         const proposedValue : number    = YIELD(ProposedOrPrevious)
        //
        //         const maxValue : number         = YIELD(max)
        //
        //         return proposedValue <= maxValue ? proposedValue : maxValue
        //     }
        // }))
        //
        // const iden2     = graph.addIdentifier(CalculatedValueGen.new({
        //     listeners   : new Set([ dispatcher ]),
        //
        //     * calculation (YIELD) : CalculationIterator<number> {
        //         const disp      = yield dispatcher
        //
        //         const value1    = yield iden1
        //
        //         yield Write(iden1, 1)
        //
        //         return proposedValue <= maxValue ? proposedValue : maxValue
        //     }
        // }))
        //
        //
        // const spy1      = t.spyOn(iden1, 'calculation')
        // const spy2      = t.spyOn(iden2, 'calculation')
        //
        // //-------------------
        // graph.propagate()
        //
        // t.expect(spy1).toHaveBeenCalled(1)
        // t.expect(spy2).toHaveBeenCalled(1)
        //
        // t.is(graph.read(iden2), 1, 'Correct value')
        //
        // //-------------------
        // spy2.reset()
        //
        // graph.write(var0, 5)
        // graph.write(var1, 7)
        //
        // graph.propagate()
        //
        // t.expect(spy1).toHaveBeenCalled(2)
        // t.expect(spy2).toHaveBeenCalled(1)
        //
        // t.is(graph.read(var0), 7, 'Correct value')
        // t.is(graph.read(var1), 5, 'Correct value')
        // t.is(graph.read(iden2), 13, 'Correct value')
    })


    // TODO
    // t.it('Base case - sync', async t => {
    //     const graph : ChronoGraph   = MinimalChronoGraph.new()
    //
    //     const var0      = graph.variableNamed('var0', 0)
    //     const var1      = graph.variableNamed('var1', 0)
    //
    //     const varMax    = graph.variableNamed('varMax', 10)
    //
    //     const idenSum   = graph.identifierNamed('idenSum', function* () {
    //         const sum : number  = (yield var0) + (yield var1)
    //
    //         const max : number  = yield varMax
    //
    //         if (sum > max) {
    //             yield Write(var0, (yield var0) - (sum - max))
    //         }
    //
    //         return sum
    //     })
    //
    //     const spy1      = t.spyOn(idenSum, 'calculation')
    //
    //     //-------------------
    //     graph.propagate()
    //
    //     t.expect(spy1).toHaveBeenCalled(1)
    //
    //     t.is(graph.read(idenSum), 0, 'Correct value')
    //
    //
    //     //-------------------
    //     spy1.reset()
    //
    //     graph.write(var0, 5)
    //     graph.write(var1, 7)
    //
    //     graph.propagate()
    //
    //     t.expect(spy1).toHaveBeenCalled(2)
    //
    //     t.is(graph.read(idenSum), 10, 'Correct value')
    //     t.is(graph.read(var0), 3, 'Correct value')
    // })
    //
    //
    // t.it('Subtree elimination - sync', async t => {
    //     const graph : ChronoGraph   = MinimalChronoGraph.new()
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
    //             yield Write(var0, value1)
    //             yield Write(var1, value0)
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
    //     graph.propagate()
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
    //     graph.propagate()
    //
    //     t.expect(spy1).toHaveBeenCalled(2)
    //     t.expect(spy2).toHaveBeenCalled(1)
    //
    //     t.is(graph.read(var0), 7, 'Correct value')
    //     t.is(graph.read(var1), 5, 'Correct value')
    //     t.is(graph.read(iden2), 13, 'Correct value')
    // })


})
