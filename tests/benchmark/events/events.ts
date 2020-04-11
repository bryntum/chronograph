import { BenchmarkC } from "../../../src/benchmark/Benchmark.js"
import { Base } from "../../../src/class/Base.js"
import { Event } from "../../../src/event/Events.js"

// import Events from '../../../../Core/lib/Core/mixin/Events.js'
// import BaseCore from '../../../../Core/lib/Core/Base.js'

//---------------------------------------------------------------------------------------------------------------------
type EventsBenchmarkState = {
}

class BenchEmitter extends Base {

    //region `event1`
    get event1 () : Event<[ this, number ]> {
        if (this.$event1 !== undefined) return this.$event1

        return this.$event1    = new Event()
    }
    $event1    : Event<[ this, number ]>  = undefined
    //endregion
    //region `event2`
    get event2 () : Event<[ this, number ]> {
        if (this.$event2 !== undefined) return this.$event2

        return this.$event2    = new Event()
    }
    $event2    : Event<[ this, number ]>  = undefined
    //endregion
    //region `event3`
    get event3 () : Event<[ this, number ]> {
        if (this.$event3 !== undefined) return this.$event3

        return this.$event3    = new Event()
    }
    $event3    : Event<[ this, number ]>  = undefined
    //endregion
    //region `event4`
    get event4 () : Event<[ this, number ]> {
        if (this.$event4 !== undefined) return this.$event4

        return this.$event4    = new Event()
    }
    $event4    : Event<[ this, number ]>  = undefined
    //endregion
    //region `event5`
    get event5 () : Event<[ this, number ]> {
        if (this.$event5 !== undefined) return this.$event5

        return this.$event5    = new Event()
    }
    $event5    : Event<[ this, number ]>  = undefined
    //endregion
    //region `event6`
    get event6 () : Event<[ this, number ]> {
        if (this.$event6 !== undefined) return this.$event6

        return this.$event6    = new Event()
    }
    $event6    : Event<[ this, number ]>  = undefined
    //endregion
    //region `event7`
    get event7 () : Event<[ this, number ]> {
        if (this.$event7 !== undefined) return this.$event7

        return this.$event7    = new Event()
    }
    $event7    : Event<[ this, number ]>  = undefined
    //endregion
    //region `event8`
    get event8 () : Event<[ this, number ]> {
        if (this.$event8 !== undefined) return this.$event8

        return this.$event8    = new Event()
    }
    $event8    : Event<[ this, number ]>  = undefined
    //endregion
    //region `event9`
    get event9 () : Event<[ this, number ]> {
        if (this.$event9 !== undefined) return this.$event9

        return this.$event9    = new Event()
    }
    $event9    : Event<[ this, number ]>  = undefined
    //endregion
    //region `event10`
    get event10 () : Event<[ this, number ]> {
        if (this.$event10 !== undefined) return this.$event10

        return this.$event10    = new Event()
    }
    $event10    : Event<[ this, number ]>  = undefined
    //endregion

    //region `Tevent1`
    get Tevent1 () : Event<[ this, number ]> {
        if (this.$Tevent1 !== undefined) return this.$Tevent1

        return this.$Tevent1    = new Event()
    }
    $Tevent1    : Event<[ this, number ]>  = undefined
    //endregion
    //region `Tevent2`
    get Tevent2 () : Event<[ this, number ]> {
        if (this.$Tevent2 !== undefined) return this.$Tevent2

        return this.$Tevent2    = new Event()
    }
    $Tevent2    : Event<[ this, number ]>  = undefined
    //endregion
    //region `Tevent3`
    get Tevent3 () : Event<[ this, number ]> {
        if (this.$Tevent3 !== undefined) return this.$Tevent3

        return this.$Tevent3    = new Event()
    }
    $Tevent3    : Event<[ this, number ]>  = undefined
    //endregion
    //region `Tevent4`
    get Tevent4 () : Event<[ this, number ]> {
        if (this.$Tevent4 !== undefined) return this.$Tevent4

        return this.$Tevent4    = new Event()
    }
    $Tevent4    : Event<[ this, number ]>  = undefined
    //endregion
    //region `Tevent5`
    get Tevent5 () : Event<[ this, number ]> {
        if (this.$Tevent5 !== undefined) return this.$Tevent5

        return this.$Tevent5    = new Event()
    }
    $Tevent5    : Event<[ this, number ]>  = undefined
    //endregion
    //region `Tevent6`
    get Tevent6 () : Event<[ this, number ]> {
        if (this.$Tevent6 !== undefined) return this.$Tevent6

        return this.$Tevent6    = new Event()
    }
    $Tevent6    : Event<[ this, number ]>  = undefined
    //endregion
    //region `Tevent7`
    get Tevent7 () : Event<[ this, number ]> {
        if (this.$Tevent7 !== undefined) return this.$Tevent7

        return this.$Tevent7    = new Event()
    }
    $Tevent7    : Event<[ this, number ]>  = undefined
    //endregion
    //region `Tevent8`
    get Tevent8 () : Event<[ this, number ]> {
        if (this.$Tevent8 !== undefined) return this.$Tevent8

        return this.$Tevent8    = new Event()
    }
    $Tevent8    : Event<[ this, number ]>  = undefined
    //endregion
    //region `Tevent9`
    get Tevent9 () : Event<[ this, number ]> {
        if (this.$Tevent9 !== undefined) return this.$Tevent9

        return this.$Tevent9    = new Event()
    }
    $Tevent9    : Event<[ this, number ]>  = undefined
    //endregion
    //region `Tevent10`
    get Tevent10 () : Event<[ this, number ]> {
        if (this.$Tevent10 !== undefined) return this.$Tevent10

        return this.$Tevent10    = new Event()
    }
    $Tevent10    : Event<[ this, number ]>  = undefined
    //endregion
}

// class BenchEmitterCore extends Events(BaseCore) {
// }

const emittersCount : number    = 10000

//---------------------------------------------------------------------------------------------------------------------
const eventsBenchmark = BenchmarkC<EventsBenchmarkState>({
    name : `Chronograph: Creating ${emittersCount} emitters, adding 1 listener on 20 events`,

    cycle (iteration : number, cycle : number, setup : EventsBenchmarkState) {
        const emitters  = []

        for (let i = 0; i < emittersCount; i++) {
            const emitter       = BenchEmitter.new()

            emitter.event1.on((emitter, number) => number++)
            emitter.event2.on((emitter, number) => number++)
            emitter.event3.on((emitter, number) => number++)
            emitter.event4.on((emitter, number) => number++)
            emitter.event5.on((emitter, number) => number++)
            emitter.event6.on((emitter, number) => number++)
            emitter.event7.on((emitter, number) => number++)
            emitter.event8.on((emitter, number) => number++)
            emitter.event9.on((emitter, number) => number++)
            emitter.event10.on((emitter, number) => number++)

            emitter.Tevent1.on((emitter, number) => number++)
            emitter.Tevent2.on((emitter, number) => number++)
            emitter.Tevent3.on((emitter, number) => number++)
            emitter.Tevent4.on((emitter, number) => number++)
            emitter.Tevent5.on((emitter, number) => number++)
            emitter.Tevent6.on((emitter, number) => number++)
            emitter.Tevent7.on((emitter, number) => number++)
            emitter.Tevent8.on((emitter, number) => number++)
            emitter.Tevent9.on((emitter, number) => number++)
            emitter.Tevent10.on((emitter, number) => number++)

            emitters.push(emitter)
        }
    }
})


//---------------------------------------------------------------------------------------------------------------------
const eventsBenchmarkCore = BenchmarkC<EventsBenchmarkState>({
    name : `Core: Creating ${emittersCount} emitters, adding 1 listener on 20 events`,

    cycle (iteration : number, cycle : number, setup : EventsBenchmarkState) {
        // const emitters  = []
        //
        // for (let i = 0; i < emittersCount; i++) {
        //     const emitter       = new BenchEmitterCore()
        //
        //     emitter.on('event1', (emitter, number) => number++)
        //     emitter.on('event2', (emitter, number) => number++)
        //     emitter.on('event3', (emitter, number) => number++)
        //     emitter.on('event4', (emitter, number) => number++)
        //     emitter.on('event5', (emitter, number) => number++)
        //     emitter.on('event6', (emitter, number) => number++)
        //     emitter.on('event7', (emitter, number) => number++)
        //     emitter.on('event8', (emitter, number) => number++)
        //     emitter.on('event9', (emitter, number) => number++)
        //     emitter.on('event10', (emitter, number) => number++)
        //
        //     emitter.on('evenT1', (emitter, number) => number++)
        //     emitter.on('evenT2', (emitter, number) => number++)
        //     emitter.on('evenT3', (emitter, number) => number++)
        //     emitter.on('evenT4', (emitter, number) => number++)
        //     emitter.on('evenT5', (emitter, number) => number++)
        //     emitter.on('evenT6', (emitter, number) => number++)
        //     emitter.on('evenT7', (emitter, number) => number++)
        //     emitter.on('evenT8', (emitter, number) => number++)
        //     emitter.on('evenT9', (emitter, number) => number++)
        //     emitter.on('evenT10', (emitter, number) => number++)
        //
        //     emitters.push(emitter)
        // }
    }
})


eventsBenchmark.measureTillMaxTime()
// eventsBenchmarkCore.measureTillMaxTime()
