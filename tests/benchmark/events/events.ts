import { BenchmarkC } from "../../../src/benchmark/Benchmark.js"
import { Base } from "../../../src/class/BetterMixin.js"
import { Event, event, EventEmitter } from "../../../src/event/Events.js"

//---------------------------------------------------------------------------------------------------------------------
type EventsBenchmarkState = {
    emitters    : EventEmitter[]
}

class BenchEmitter extends EventEmitter.mix(Base) {
    @event()
    event1      : Event<[ this, number ]>
    @event()
    event2      : Event<[ this, number ]>
    @event()
    event3      : Event<[ this, number ]>
    @event()
    event4      : Event<[ this, number ]>
    @event()
    event5      : Event<[ this, number ]>
    @event()
    event6      : Event<[ this, number ]>
    @event()
    event7      : Event<[ this, number ]>
    @event()
    event8      : Event<[ this, number ]>
    @event()
    event9      : Event<[ this, number ]>
    @event()
    event10     : Event<[ this, number ]>

    @event()
    evenT1      : Event<[ this, number ]>
    @event()
    evenT2      : Event<[ this, number ]>
    @event()
    evenT3      : Event<[ this, number ]>
    @event()
    evenT4      : Event<[ this, number ]>
    @event()
    evenT5      : Event<[ this, number ]>
    @event()
    evenT6      : Event<[ this, number ]>
    @event()
    evenT7      : Event<[ this, number ]>
    @event()
    evenT8      : Event<[ this, number ]>
    @event()
    evenT9      : Event<[ this, number ]>
    @event()
    evenT10     : Event<[ this, number ]>
}

const emittersCount : number    = 10000

//---------------------------------------------------------------------------------------------------------------------
const eventsBenchmark = BenchmarkC<EventsBenchmarkState>({

    cycle (iteration : number, cycle : number, setup : EventsBenchmarkState) {
        const emitters  = []

        for (let i = 0; i < emittersCount; i++) emitters.push(BenchEmitter.new())
    }
})


eventsBenchmark.measureTillMaxTime()
