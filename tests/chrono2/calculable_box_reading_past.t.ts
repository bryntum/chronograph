import { CalculationModeSync } from "../../src/chrono2/CalculationMode.js"
import { Box } from "../../src/chrono2/data/Box.js"
import { CalculableBox } from "../../src/chrono2/data/CalculableBox.js"
import {
    EffectHandler,
    PreviousValueOf,
    ProposedArgumentsOf,
    ProposedOrPrevious,
    ProposedOrPreviousValueOf,
    ProposedValueOf
} from "../../src/chrono2/Effect.js"
import { ChronoGraph } from "../../src/chrono2/graph/Graph.js"
import { takeUntilExcluding } from "../../src/collection/Iterator.js"

declare const StartTest : any

StartTest(t => {

    t.it('Should be able to read the past of the identifier which is being listened - PreviousValueOf', async t => {
        const graph : ChronoGraph   = ChronoGraph.new({ historyLimit : 0 })

        let result

        const listener      = graph.addAtom(new CalculableBox({
            // lazy : false,
            calculation (Y : EffectHandler<CalculationModeSync>) : any {
                return result = Y(PreviousValueOf(source))
            }
        }))

        const var1          = new Box(0)

        const sourceMode    = new Box('proposed')

        const source        = graph.addAtom(new CalculableBox({
            // lazy : false,
            calculation (Y : EffectHandler<CalculationModeSync>) : number {
                const mode : string     = Y(sourceMode)

                if (mode === 'proposed')
                    return Y(ProposedOrPrevious)
                else
                    return Y(var1) + 1
            }
        }))

        const spy           = t.spyOn(listener, 'calculation')

        //----------------
        source.write(10)

        graph.commit()

        t.is(source.read(), 10, 'Source value correct #1')
        t.is(listener.read(), null, 'Listener value correct #1')

        t.expect(spy).toHaveBeenCalled(1)

        //----------------
        spy.reset()

        sourceMode.write('pure')

        graph.commit()

        t.is(source.read(), 1, 'Source value correct #2')
        t.isStrict(listener.read(), 10, 'Listener value correct #2')
        t.isStrict(result, 10, 'Listener value correct #2')

        t.expect(spy).toHaveBeenCalled(1)

        //----------------
        spy.reset()

        var1.write(1)

        graph.commit()

        t.is(source.read(), 2, 'Source value correct #3')
        t.isStrict(listener.read(), 1, 'Listener value correct #2')
        t.isStrict(result, 1, 'Listener value correct #2')

        t.expect(spy).toHaveBeenCalled(1)

        //----------------
        spy.reset()

        sourceMode.write('proposed')
        source.write(14)

        graph.commit()

        t.is(source.read(), 14, 'Source value correct #4')
        t.is(listener.read(), 2, 'Listener value correct #4')

        t.expect(spy).toHaveBeenCalled(1)
    })


    t.it('Should be able to read the past of the identifier which is being listened - ProposedValueOf', async t => {
        const graph : ChronoGraph   = ChronoGraph.new({ historyLimit : 0 })

        let result

        const listener      = graph.addAtom(new CalculableBox({
            calculation (Y : EffectHandler<CalculationModeSync>) : any {
                return result = Y(ProposedValueOf(source))
            }
        }))

        const var1          = new Box(0)

        const sourceMode    = new Box('proposed')

        const source        = graph.addAtom(new CalculableBox({
            calculation (Y : EffectHandler<CalculationModeSync>) : number {
                const mode : string     = Y(sourceMode)

                if (mode === 'proposed')
                    return Y(ProposedOrPrevious)
                else
                    return Y(var1) + 1
            }
        }))

        const spy           = t.spyOn(listener, 'calculation')

        //----------------
        source.write(10)

        graph.commit()

        t.is(source.read(), 10, 'Source value correct #1')
        t.is(listener.read(), 10, 'Listener value correct #1')

        t.expect(spy).toHaveBeenCalled(1)

        //----------------
        spy.reset()

        sourceMode.write('pure')

        graph.commit()

        t.is(source.read(), 1, 'Source value correct #2')
        t.isStrict(listener.read(), null, 'Listener value correct #2')
        t.isStrict(result, undefined, 'Listener value correct #2')

        t.expect(spy).toHaveBeenCalled(1)

        //----------------
        spy.reset()

        var1.write(1)

        graph.commit()

        t.is(source.read(), 2, 'Source value correct #3')
        t.isStrict(listener.read(), null, 'Listener value correct #2')
        t.isStrict(result, undefined, 'Listener value correct #2')

        t.expect(spy).toHaveBeenCalled(1)

        //----------------
        spy.reset()

        sourceMode.write('proposed')
        source.write(14)

        graph.commit()

        t.is(source.read(), 14, 'Source value correct #4')
        t.is(listener.read(), 14, 'Listener value correct #4')

        t.expect(spy).toHaveBeenCalled(1)
    })


    t.it('Should be able to read the past of the identifier which is being listened - ProposedOrPreviousValueOf', async t => {
        const graph : ChronoGraph   = ChronoGraph.new({ historyLimit : 0 })

        const listener      = graph.addAtom(new CalculableBox({
            calculation (YIELD : EffectHandler<CalculationModeSync>) : any {
                return YIELD(ProposedOrPreviousValueOf(source))
            }
        }))

        const var1          = new Box(0)

        const sourceMode    = new Box('proposed')

        const source        = graph.addAtom(new CalculableBox({
            calculation (YIELD : EffectHandler<CalculationModeSync>) : number {
                const mode : string     = YIELD(sourceMode)

                if (mode === 'proposed')
                    return YIELD(ProposedOrPrevious)
                else
                    return YIELD(var1) + 1
            }
        }))

        const spy           = t.spyOn(listener, 'calculation')

        //----------------
        source.write(10)

        graph.commit()

        t.is(source.read(), 10, 'Source value correct #1')
        t.is(listener.read(), 10, 'Listener value correct #1')

        t.expect(spy).toHaveBeenCalled(1)

        //----------------
        spy.reset()

        sourceMode.write('pure')

        graph.commit()

        t.is(source.read(), 1, 'Source value correct #2')
        t.is(listener.read(), 10, 'Listener value correct #2')

        t.expect(spy).toHaveBeenCalled(1)

        //----------------
        spy.reset()

        var1.write(1)

        graph.commit()

        t.is(source.read(), 2, 'Source value correct #3')
        t.is(listener.read(), 1, 'Listener value correct #3')

        t.expect(spy).toHaveBeenCalled(1)

        //----------------
        spy.reset()

        sourceMode.write('proposed')
        source.write(14)

        graph.commit()

        t.is(source.read(), 14, 'Source value correct #4')
        t.is(listener.read(), 14, 'Listener value correct #4')

        t.expect(spy).toHaveBeenCalled(1)
    })


    t.it('Should be able to read the past of the identifier which is being listened - ProposedArgumentsOf', async t => {
        const graph : ChronoGraph   = ChronoGraph.new({ historyLimit : 0 })

        let result

        const listener      = graph.addAtom(new CalculableBox({
            calculation (YIELD : EffectHandler<CalculationModeSync>) : any {
                return result = YIELD(ProposedArgumentsOf(source))
            }
        }))

        const var1          = new Box(0)

        const sourceMode    = new Box('proposed')

        const source        = graph.addAtom(new CalculableBox({
            calculation (YIELD : EffectHandler<CalculationModeSync>) : number {
                const mode : string     = YIELD(sourceMode)

                if (mode === 'proposed')
                    return YIELD(ProposedOrPrevious)
                else
                    return YIELD(var1) + 1
            }
        }))

        const spy           = t.spyOn(listener, 'calculation')

        //----------------
        source.write(10)

        graph.commit()

        t.is(source.read(), 10, 'Source value correct #1')
        t.isDeeply(listener.read(), null, 'Listener value correct #1')

        t.expect(spy).toHaveBeenCalled(1)

        //----------------
        spy.reset()

        source.write(11, 1, 2, 3)

        graph.commit()

        t.is(source.read(), 11, 'Source value correct #1.5')
        t.isDeeply(listener.read(), [ 1, 2, 3 ], 'Listener value correct #1.5')

        t.expect(spy).toHaveBeenCalled(1)

        //----------------
        spy.reset()

        sourceMode.write('pure')

        graph.commit()

        t.is(source.read(), 1, 'Source value correct #2')
        t.isStrict(listener.read(), null, 'Listener value correct #2')
        t.isStrict(result, undefined, 'Listener value correct #2')

        t.expect(spy).toHaveBeenCalled(1)

        //----------------
        spy.reset()

        var1.write(1)

        graph.commit()

        t.is(source.read(), 2, 'Source value correct #3')
        t.isStrict(listener.read(), null, 'Listener value correct #2')
        t.isStrict(result, undefined, 'Listener value correct #2')

        t.expect(spy).toHaveBeenCalled(1)

        //----------------
        spy.reset()

        sourceMode.write('proposed')
        source.write(14)

        graph.commit()

        t.is(source.read(), 14, 'Source value correct #4')
        t.is(listener.read(), null, 'Listener value correct #4')

        t.expect(spy).toHaveBeenCalled(1)
    })


    t.it('Reading past should not cause cycles', async t => {
        const var1          = new Box(0, 'var1')

        const dispatcher    = new CalculableBox({
            name : 'dispatcher',
            calculation () : boolean {
                return box2.readProposed() !== undefined
            }
        })

        const box2          = new CalculableBox({
            name : 'box2',
            calculation () : number {
                const dispatcherValue    = dispatcher.read()

                if (dispatcherValue)
                    return box2.readProposedOrPrevious()
                else
                    return var1.read()
            }
        })

        t.is(box2.read(), 0)
        t.is(dispatcher.read(), false)

        box2.write(100)

        t.is(dispatcher.read(), true)
        t.is(box2.read(), 100)
    })


    t.it('Reading past should not cause cycles and extra computations', async t => {
        const graph         = ChronoGraph.new()

        const var1          = new Box(0, 'var1')

        let counter1        = 0

        const dispatcher    = new CalculableBox({
            name    : 'dispatcher',
            lazy    : false,
            calculation () : boolean {
                counter1++

                return box2.readProposed() !== undefined
            }
        })

        let counter2        = 0

        const box2          = new CalculableBox({
            name    : 'box2',
            lazy    : false,
            calculation () : number {
                counter2++

                const dispatcherValue    = dispatcher.read()

                if (dispatcherValue)
                    return box2.readProposedOrPrevious()
                else
                    return var1.read()
            }
        })

        graph.addAtoms([ var1, dispatcher, box2 ])

        graph.commit()

        t.isDeeply([ counter1, counter2 ], [ 1, 1 ])

        t.is(box2.read(), 0)
        t.is(dispatcher.read(), false)

        //----------------------
        counter1 = counter2 = 0

        box2.write(100)

        graph.commit()

        t.isDeeply([ counter1, counter2 ], [ 1, 1 ])

        t.is(box2.read(), 100)
        t.is(dispatcher.read(), true)
    })

})
