import { ProposedArgumentsOf, ProposedOrCurrent, ProposedValueOf } from "../../src/chrono/Effect.js"
import { Identifier } from "../../src/chrono/Identifier.js"
import { Quark } from "../../src/chrono/Quark.js"
import { SyncEffectHandler, Transaction } from "../../src/chrono/Transaction.js"
import { Base } from "../../src/class/Mixin.js"
import { CalculationIterator } from "../../src/primitives/Calculation.js"
import { build_proposed, calculate, Entity, field } from "../../src/replica/Entity.js"
import { MinimalReplica, Replica } from "../../src/replica/Replica.js"

declare const StartTest : any

type DispatcherValue        = Map<FieldType, CalculationMode>


const isNotNumber = (value : any) => Number(value) !== value

const dispatcherValueEq     = (v1 : DispatcherValue, v2 : DispatcherValue) : boolean => {
    return v1.get(FieldType.Start) === v2.get(FieldType.Start)
        && v1.get(FieldType.End) === v2.get(FieldType.End)
        && v1.get(FieldType.Duration) === v2.get(FieldType.Duration)
}

enum CalculationMode {
    CalculateProposed     = 'CalculateProposed',
    CalculatePure  = 'CalculatePure'
}

enum FieldType {
    Start   = 'Start',
    End     = 'End',
    Duration = 'Duration'
}

enum Instruction {
    KeepDuration    = 'KeepDuration',
    KeepStart       = 'KeepStart',
    KeepEnd         = 'KeepEnd'
}

enum Direction {
    Forward         = 'Forward',
    Backward        = 'Backward'
}


class Event extends Entity(Base) {
    @field()
    start       : number

    @field()
    end         : number

    @field()
    duration    : number

    @field()
    direction   : Direction    = Direction.Forward

    @field({ equality : dispatcherValueEq })
    dispatcher  : DispatcherValue


    setStart : (value : number, instruction : Instruction) => any
    setEnd : (value : number, instruction : Instruction) => any
    setDuration : (value : number, instruction : Instruction) => any

    @calculate('start')
    * calculateStart () : CalculationIterator<number> {
        const dispatch : DispatcherValue = yield this.$.dispatcher

        const instruction : CalculationMode = dispatch.get(FieldType.Start)

        if (instruction === CalculationMode.CalculatePure) {
            const endValue : number         = yield this.$.end
            const durationValue : number    = yield this.$.duration

            if (isNotNumber(endValue) || isNotNumber(durationValue)) return null

            return endValue - durationValue
        }
        else if (instruction === CalculationMode.CalculateProposed) {
            return yield ProposedOrCurrent
        }
    }


    @calculate('end')
    * calculateEnd () : CalculationIterator<number> {
        const dispatch : DispatcherValue = yield this.$.dispatcher

        const instruction : CalculationMode = dispatch.get(FieldType.End)

        if (instruction === CalculationMode.CalculatePure) {
            const startValue : number       = yield this.$.start
            const durationValue : number    = yield this.$.duration

            if (isNotNumber(startValue) || isNotNumber(durationValue)) return null

            return startValue + durationValue
        }
        else if (instruction === CalculationMode.CalculateProposed) {
            return yield ProposedOrCurrent
        }
    }


    @calculate('duration')
    * calculateDuration () : CalculationIterator<number> {
        const dispatch : DispatcherValue = yield this.$.dispatcher

        const instruction : CalculationMode = dispatch.get(FieldType.Duration)

        if (instruction === CalculationMode.CalculatePure) {
            const startValue : number       = yield this.$.start
            const endValue : number         = yield this.$.end

            if (isNotNumber(startValue) || isNotNumber(endValue)) return null

            return endValue - startValue
        }
        else if (instruction === CalculationMode.CalculateProposed) {
            return yield ProposedOrCurrent
        }
    }


    @build_proposed('dispatcher')
    buildProposedDispatcher (me : Identifier, quark : Quark, transaction : Transaction) : DispatcherValue {
        const direction : Direction    = transaction.readProposedOrPrevious(this.$.direction)

        return new Map([
            [ FieldType.Start, direction === Direction.Forward ? CalculationMode.CalculateProposed : CalculationMode.CalculateProposed ],
            [ FieldType.End, direction === Direction.Forward ? CalculationMode.CalculatePure : CalculationMode.CalculatePure ],
            [ FieldType.Duration, CalculationMode.CalculateProposed ]
        ])
    }


    @calculate('dispatcher')
    * calculateDispatcher (YIELD : SyncEffectHandler) : CalculationIterator<DispatcherValue> {
        const proposedOrCurrent                 = yield ProposedOrCurrent

        // if (window.DEBUG) debugger

        const directionValue : Direction        = yield this.$.direction

        let startMode : CalculationMode         = (yield ProposedValueOf(this.$.start)) !== undefined ? CalculationMode.CalculateProposed : CalculationMode.CalculatePure
        let endMode : CalculationMode           = (yield ProposedValueOf(this.$.end)) !== undefined ? CalculationMode.CalculateProposed : CalculationMode.CalculatePure
        let durationMode : CalculationMode      = (yield ProposedValueOf(this.$.duration)) !== undefined ? CalculationMode.CalculateProposed : CalculationMode.CalculatePure

        //---------------
        const startArgs                         = yield ProposedArgumentsOf(this.$.start)

        if (startArgs) {
            if (startArgs[ 0 ] === Instruction.KeepDuration) durationMode = CalculationMode.CalculateProposed
            if (startArgs[ 0 ] === Instruction.KeepEnd) endMode = CalculationMode.CalculateProposed
        }

        //---------------
        const endArgs                           = yield ProposedArgumentsOf(this.$.end)

        if (endArgs) {
            if (endArgs[ 0 ] === Instruction.KeepDuration) durationMode = CalculationMode.CalculateProposed
            if (endArgs[ 0 ] === Instruction.KeepStart) startMode = CalculationMode.CalculateProposed
        }

        //---------------
        const durationArgs                      = yield ProposedArgumentsOf(this.$.duration)

        if (durationArgs) {
            if (durationArgs[ 0 ] === Instruction.KeepStart) startMode = CalculationMode.CalculateProposed
            if (durationArgs[ 0 ] === Instruction.KeepEnd) endMode = CalculationMode.CalculateProposed
        }

        //---------------
        let withProposedCounter : number        = 0

        if (startMode === CalculationMode.CalculateProposed) withProposedCounter++
        if (endMode === CalculationMode.CalculateProposed) withProposedCounter++
        if (durationMode === CalculationMode.CalculateProposed) withProposedCounter++

        if (withProposedCounter === 3) {
            if (directionValue === Direction.Forward)
                endMode     = CalculationMode.CalculatePure
            else
                startMode   = CalculationMode.CalculatePure
        }
        else if (withProposedCounter <= 1) {
            startMode       = CalculationMode.CalculateProposed
            endMode         = CalculationMode.CalculateProposed
            durationMode    = CalculationMode.CalculateProposed
        }

        return new Map([
            [ FieldType.Start, startMode ],
            [ FieldType.End, endMode ],
            [ FieldType.Duration, durationMode ]
        ])
    }
}


StartTest(t => {

    let replica : Replica
    let event : Event

    let var0

    const read = () => [ event.start, event.end, event.duration ]

    t.beforeEach(t => {
        replica = MinimalReplica.new()
        event   = Event.new()

        var0    = replica.variable(0)

        replica.addEntity(event)
    })


    t.it('Should keep all-null state', async t => {
        replica.commit()

        t.isDeeply(read(), [ null, null, null ], 'Initial propagation is ok')
    })


    t.it('Should keep partial data - start', async t => {
        event.start = 10

        replica.commit()

        t.isDeeply(read(), [ 10, null, null ], 'Initial propagation is ok')
    })


    t.it('Should keep partial data - end', async t => {
        event.end = 10

        replica.commit()

        t.isDeeply(read(), [ null, 10, null ], 'Initial propagation is ok')
    })


    t.it('Should keep partial data - duration', async t => {
        event.duration = 10

        replica.commit()

        t.isDeeply(read(), [ null, null, 10 ], 'Initial propagation is ok')
    })


    t.it('Should normalize end date', async t => {
        event.start = 10
        event.duration = 5

        replica.commit()

        t.isDeeply(read(), [ 10, 15, 5 ], 'Initial propagation is ok')
    })


    t.it('Should normalize duration', async t => {
        event.start = 10
        event.end = 15

        replica.commit()

        t.isDeeply(read(), [ 10, 15, 5 ], 'Initial propagation is ok')
    })


    t.it('Should normalize start and recalculate everything after', async t => {
        const spyDispatcher     = t.spyOn(event.$.dispatcher, 'calculation')
        const spyStart          = t.spyOn(event.$.start, 'calculation')
        const spyEnd            = t.spyOn(event.$.end, 'calculation')
        const spyDuration       = t.spyOn(event.$.duration, 'calculation')

        event.end = 15
        event.duration = 5

        replica.commit()

        t.isDeeply(read(), [ 10, 15, 5 ], 'Initial propagation is ok')

        // 1st time calculation is done during the propagate - 2nd during read
        t.expect(spyDispatcher).toHaveBeenCalled(1)
        t.expect(spyStart).toHaveBeenCalled(1)
        t.expect(spyEnd).toHaveBeenCalled(1)
        t.expect(spyDuration).toHaveBeenCalled(1)

        //----------------
        // tslint:disable-next-line
        ;[ spyDispatcher, spyStart, spyEnd, spyDuration ].forEach(spy => spy.reset())

        replica.write(var0, 1)

        replica.commit()

        // no calculations during the propagate, as those were already done during the read
        t.expect(spyDispatcher).toHaveBeenCalled(1)
        t.expect(spyStart).toHaveBeenCalled(1)
        t.expect(spyEnd).toHaveBeenCalled(1)
        t.expect(spyDuration).toHaveBeenCalled(1)
    })


    t.it('Should normalize end date by default', async t => {
        event.start = 10
        event.end = 18
        event.duration = 5

        replica.commit()

        t.isDeeply(read(), [ 10, 15, 5 ], 'Initial propagation is ok')
    })


    t.it('Should not recalculate everything on 2nd propagation', async t => {
        const spy           = t.spyOn(event.$.dispatcher, 'calculation')

        event.start = 10
        event.end = 18
        event.duration = 5

        replica.commit()

        t.isDeeply(read(), [ 10, 15, 5 ], 'Initial propagation is ok')

        t.expect(spy).toHaveBeenCalled(1)

        //----------------
        spy.reset()

        replica.write(var0, 1)

        replica.commit()

        t.expect(spy).toHaveBeenCalled(0)
    })


    t.it('Should rebuild edges dynamically', async t => {
        event.start = 10
        event.duration = 5

        replica.commit()

        t.isDeeply(read(), [ 10, 15, 5 ], 'Initial propagation is ok')

        //-----------------------
        await event.setDuration(1, Instruction.KeepEnd)

        replica.commit()

        t.isDeeply(read(), [ 14, 15, 1 ], 'Edges rebuilt correctly')

        //-----------------------
        await event.setDuration(3, Instruction.KeepStart)

        replica.commit()

        t.isDeeply(read(), [ 14, 17, 3 ], 'Edges rebuilt correctly')

        //-----------------------
        await event.setStart(5, Instruction.KeepDuration)

        replica.commit()

        t.isDeeply(read(), [ 5, 8, 3 ], 'Edges rebuilt correctly')
    })
})
