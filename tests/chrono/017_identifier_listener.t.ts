import { PreviousValueOf, ProposedArgumentsOf, ProposedOrPrevious, ProposedOrPreviousValueOf, ProposedValueOf } from "../../src/chrono/Effect.js"
import { ChronoGraph } from "../../src/chrono/Graph.js"
import { CalculatedValueSync } from "../../src/chrono/Identifier.js"
import { SyncEffectHandler } from "../../src/chrono/Transaction.js"

declare const StartTest : any

StartTest(t => {

    t.it('Should be able to read the past of the identifier which is being listened - PreviousValueOf', async t => {
        const graph : ChronoGraph   = ChronoGraph.new()

        let result

        const listener      = graph.addIdentifier(CalculatedValueSync.new({
            calculation (YIELD : SyncEffectHandler) : any {
                return result = YIELD(PreviousValueOf(source))
            }
        }))

        const var1          = graph.variable(0)

        const sourceMode    = graph.variable('proposed')

        const source        = graph.addIdentifier(CalculatedValueSync.new({
            calculation (YIELD : SyncEffectHandler) : number {
                const mode : string     = YIELD(sourceMode)

                if (mode === 'proposed')
                    return YIELD(ProposedOrPrevious)
                else
                    return YIELD(var1) + 1
            }
        }))

        const spy           = t.spyOn(listener, 'calculation')

        //----------------
        graph.write(source, 10)

        graph.commit()

        t.is(graph.read(source), 10, 'Source value correct #1')
        t.is(graph.read(listener), null, 'Listener value correct #1')

        t.expect(spy).toHaveBeenCalled(1)

        //----------------
        spy.reset()

        graph.write(sourceMode, 'pure')

        graph.commit()

        t.is(graph.read(source), 1, 'Source value correct #2')
        t.isStrict(graph.read(listener), 10, 'Listener value correct #2')
        t.isStrict(result, 10, 'Listener value correct #2')

        t.expect(spy).toHaveBeenCalled(1)

        //----------------
        spy.reset()

        graph.write(var1, 1)

        graph.commit()

        t.is(graph.read(source), 2, 'Source value correct #3')
        t.isStrict(graph.read(listener), 1, 'Listener value correct #2')
        t.isStrict(result, 1, 'Listener value correct #2')

        t.expect(spy).toHaveBeenCalled(1)

        //----------------
        spy.reset()

        graph.write(sourceMode, 'proposed')
        graph.write(source, 14)

        graph.commit()

        t.is(graph.read(source), 14, 'Source value correct #4')
        t.is(graph.read(listener), 2, 'Listener value correct #4')

        t.expect(spy).toHaveBeenCalled(1)
    })


    t.it('Should be able to read the past of the identifier which is being listened - ProposedValueOf', async t => {
        const graph : ChronoGraph   = ChronoGraph.new()

        let result

        const listener      = graph.addIdentifier(CalculatedValueSync.new({
            calculation (YIELD : SyncEffectHandler) : any {
                return result = YIELD(ProposedValueOf(source))
            }
        }))

        const var1          = graph.variable(0)

        const sourceMode    = graph.variable('proposed')

        const source        = graph.addIdentifier(CalculatedValueSync.new({
            calculation (YIELD : SyncEffectHandler) : number {
                const mode : string     = YIELD(sourceMode)

                if (mode === 'proposed')
                    return YIELD(ProposedOrPrevious)
                else
                    return YIELD(var1) + 1
            }
        }))

        const spy           = t.spyOn(listener, 'calculation')

        //----------------
        graph.write(source, 10)

        graph.commit()

        t.is(graph.read(source), 10, 'Source value correct #1')
        t.is(graph.read(listener), 10, 'Listener value correct #1')

        t.expect(spy).toHaveBeenCalled(1)

        //----------------
        spy.reset()

        graph.write(sourceMode, 'pure')

        graph.commit()

        t.is(graph.read(source), 1, 'Source value correct #2')
        t.isStrict(graph.read(listener), null, 'Listener value correct #2')
        t.isStrict(result, undefined, 'Listener value correct #2')

        t.expect(spy).toHaveBeenCalled(1)

        //----------------
        spy.reset()

        graph.write(var1, 1)

        graph.commit()

        t.is(graph.read(source), 2, 'Source value correct #3')
        t.isStrict(graph.read(listener), null, 'Listener value correct #2')
        t.isStrict(result, undefined, 'Listener value correct #2')

        t.expect(spy).toHaveBeenCalled(1)

        //----------------
        spy.reset()

        graph.write(sourceMode, 'proposed')
        graph.write(source, 14)

        graph.commit()

        t.is(graph.read(source), 14, 'Source value correct #4')
        t.is(graph.read(listener), 14, 'Listener value correct #4')

        t.expect(spy).toHaveBeenCalled(1)
    })


    t.it('Should be able to read the past of the identifier which is being listened - ProposedOrPreviousValueOf', async t => {
        const graph : ChronoGraph   = ChronoGraph.new()

        const listener      = graph.addIdentifier(CalculatedValueSync.new({
            calculation (YIELD : SyncEffectHandler) : any {
                return YIELD(ProposedOrPreviousValueOf(source))
            }
        }))

        const var1          = graph.variable(0)

        const sourceMode    = graph.variable('proposed')

        const source        = graph.addIdentifier(CalculatedValueSync.new({
            calculation (YIELD : SyncEffectHandler) : number {
                const mode : string     = YIELD(sourceMode)

                if (mode === 'proposed')
                    return YIELD(ProposedOrPrevious)
                else
                    return YIELD(var1) + 1
            }
        }))

        const spy           = t.spyOn(listener, 'calculation')

        //----------------
        graph.write(source, 10)

        graph.commit()

        t.is(graph.read(source), 10, 'Source value correct #1')
        t.is(graph.read(listener), 10, 'Listener value correct #1')

        t.expect(spy).toHaveBeenCalled(1)

        //----------------
        spy.reset()

        graph.write(sourceMode, 'pure')

        graph.commit()

        t.is(graph.read(source), 1, 'Source value correct #2')
        t.is(graph.read(listener), 10, 'Listener value correct #2')

        t.expect(spy).toHaveBeenCalled(1)

        //----------------
        spy.reset()

        graph.write(var1, 1)

        graph.commit()

        t.is(graph.read(source), 2, 'Source value correct #3')
        t.is(graph.read(listener), 1, 'Listener value correct #3')

        t.expect(spy).toHaveBeenCalled(1)

        //----------------
        spy.reset()

        graph.write(sourceMode, 'proposed')
        graph.write(source, 14)

        graph.commit()

        t.is(graph.read(source), 14, 'Source value correct #4')
        t.is(graph.read(listener), 14, 'Listener value correct #4')

        t.expect(spy).toHaveBeenCalled(1)
    })


    t.it('Should be able to read the past of the identifier which is being listened - ProposedArgumentsOf', async t => {
        const graph : ChronoGraph   = ChronoGraph.new()

        let result

        const listener      = graph.addIdentifier(CalculatedValueSync.new({
            calculation (YIELD : SyncEffectHandler) : any {
                return result = YIELD(ProposedArgumentsOf(source))
            }
        }))

        const var1          = graph.variable(0)

        const sourceMode    = graph.variable('proposed')

        const source        = graph.addIdentifier(CalculatedValueSync.new({
            calculation (YIELD : SyncEffectHandler) : number {
                const mode : string     = YIELD(sourceMode)

                if (mode === 'proposed')
                    return YIELD(ProposedOrPrevious)
                else
                    return YIELD(var1) + 1
            }
        }))

        const spy           = t.spyOn(listener, 'calculation')

        //----------------
        graph.write(source, 10)

        graph.commit()

        t.is(graph.read(source), 10, 'Source value correct #1')
        t.isDeeply(graph.read(listener), null, 'Listener value correct #1')

        t.expect(spy).toHaveBeenCalled(1)

        //----------------
        spy.reset()

        graph.write(source, 11, 1, 2, 3)

        graph.commit()

        t.is(graph.read(source), 11, 'Source value correct #1.5')
        t.isDeeply(graph.read(listener), [ 1, 2, 3 ], 'Listener value correct #1.5')

        t.expect(spy).toHaveBeenCalled(1)

        //----------------
        spy.reset()

        graph.write(sourceMode, 'pure')

        graph.commit()

        t.is(graph.read(source), 1, 'Source value correct #2')
        t.isStrict(graph.read(listener), null, 'Listener value correct #2')
        t.isStrict(result, undefined, 'Listener value correct #2')

        t.expect(spy).toHaveBeenCalled(1)

        //----------------
        spy.reset()

        graph.write(var1, 1)

        graph.commit()

        t.is(graph.read(source), 2, 'Source value correct #3')
        t.isStrict(graph.read(listener), null, 'Listener value correct #2')
        t.isStrict(result, undefined, 'Listener value correct #2')

        t.expect(spy).toHaveBeenCalled(1)

        //----------------
        spy.reset()

        graph.write(sourceMode, 'proposed')
        graph.write(source, 14)

        graph.commit()

        t.is(graph.read(source), 14, 'Source value correct #4')
        t.is(graph.read(listener), null, 'Listener value correct #4')

        t.expect(spy).toHaveBeenCalled(1)
    })
})
