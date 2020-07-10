import { computed, observable } from "mobx/lib/mobx.module.js"
import { Benchmark } from "../../../src/benchmark/Benchmark.js"
import { Box } from "../../../src/chrono2/data/Box.js"
import { CalculableBox } from "../../../src/chrono2/data/CalculableBox.js"
import { Base } from "../../../src/class/Base.js"
import { AnyFunction } from "../../../src/class/Mixin.js"


//---------------------------------------------------------------------------------------------------------------------
export interface BoxAbstract<V> {
    READ () : V
    WRITE (value : V)
}

export interface BoxMobxRaw<V> {
    get () : V
    set (value : V)
}

export class BoxMobx<V> extends Base implements BoxAbstract<V> {
    box     : any

    constructor (box) {
        super()

        this.box = box
    }


    get () : V {
        return this.box.get()
    }
    set (value : V) {
        return this.box.set(value)
    }


    READ () : V {
        return this.box.get()
    }
    WRITE (value : V) {
        return this.box.set(value)
    }
}

export class BoxChronoGraph2<V> extends Base implements BoxAbstract<V> {
    box     : Box<V>

    constructor (box) {
        super()

        this.box = box
    }


    read () : V {
        return this.box.read()
    }
    write (value : V) {
        return this.box.write(value)
    }


    READ () : V {
        return this.box.read()
    }
    WRITE (value : V) {
        return this.box.write(value)
    }
}


//---------------------------------------------------------------------------------------------------------------------
export interface GraphGenerator<RawBox> {
    rawBox<V> (initialValue : V, name? : string) : RawBox
    box<V> (initialValue : V, name? : string) : BoxAbstract<V>

    rawComputed<V> (func : AnyFunction<V>, context? : any, name? : string) : RawBox
    computed<V> (func : AnyFunction<V>, context? : any, name? : string) : BoxAbstract<V>
}


//---------------------------------------------------------------------------------------------------------------------
export class GraphGeneratorMobx implements GraphGenerator<BoxMobxRaw<unknown>> {
    rawBox<V> (initialValue : V, name? : string) : BoxMobx<unknown> {
        return observable.box(initialValue)
    }


    box<V> (initialValue : V, name? : string) : BoxAbstract<V> {
        return new BoxMobx(observable.box(initialValue))
    }


    rawComputed<V> (func : AnyFunction<V>, context? : any, name? : string) : BoxMobxRaw<unknown> {
        return computed(func, { keepAlive : true, context : context, name : name })
    }

    computed<V> (func : AnyFunction<V>, context? : any, name? : string) : BoxAbstract<V> {
        return new BoxMobx(computed(func, { keepAlive : true, context : context, name : name }))
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class GraphGeneratorChronoGraph2 implements GraphGenerator<Box<unknown>> {

    rawBox<V> (initialValue : V, name? : string) : Box<unknown> {
        return new Box(initialValue, name)
    }

    box<V> (initialValue : V, name? : string) : BoxAbstract<V> {
        return new BoxChronoGraph2(new Box(initialValue, name))
    }


    rawComputed<V> (func : AnyFunction<V>, context? : any, name? : string) : Box<unknown> {
        return new CalculableBox({ calculation : func, context : context, name : name })
    }

    computed<V> (func : AnyFunction<V>, context? : any, name? : string) : BoxAbstract<V> {
        return new BoxChronoGraph2(new CalculableBox({ calculation : func, context : context, name : name }))
    }
}


//---------------------------------------------------------------------------------------------------------------------
export type GraphGenerationResult  = { boxes : BoxAbstract<unknown>[], counter : number }


//---------------------------------------------------------------------------------------------------------------------
export type PostBenchInfo = {
    totalCount      : number
    result          : number
}

//---------------------------------------------------------------------------------------------------------------------
export class GraphlessBenchmark<
    StateT extends GraphGenerationResult = GraphGenerationResult,
    InfoT extends PostBenchInfo = PostBenchInfo
> extends Benchmark<StateT, InfoT> {

    gatherInfo (state : StateT) : InfoT {
        const { boxes } = state

        return {
            totalCount      : state.counter,
            result          : boxes[ boxes.length - 1 ].READ() as number
        } as InfoT
    }


    stringifyInfo (info : InfoT) : string {
        return `Total calculation: ${info.totalCount}\nResult in last box: ${info.result}`
    }
}
