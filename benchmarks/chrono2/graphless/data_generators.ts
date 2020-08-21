import { computed, observable } from "../../../node_modules/mobx/lib/mobx.module.js"
import { Benchmark } from "../../../src/benchmark/Benchmark.js"
import { Box } from "../../../src/chrono2/data/Box.js"
import { CalculableBox } from "../../../src/chrono2/data/CalculableBox.js"
import { CalculableBoxGen } from "../../../src/chrono2/data/CalculableBoxGen.js"
import { Base } from "../../../src/class/Base.js"
import { AnyFunction } from "../../../src/class/Mixin.js"


//---------------------------------------------------------------------------------------------------------------------
// might look silly to have such "abstract" class, but idea is that hopefully v8
// will figure out that all its subclasses has the same "shape" and `.READ(), .WRITE()`
// calls won't become "megamorphic"
export class BoxAbstract<V> {
    box     : unknown

    READ () : V {
        throw new Error("Abstract method called")
    }
    WRITE (value : V) {
        throw new Error("Abstract method called")
    }
}

export interface BoxMobxRaw<V> {
    get () : V
    set (value : V)
}

export class BoxMobx<V> extends BoxAbstract<V> {
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

export class BoxChronoGraph2<V> extends BoxAbstract<V> {
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
export interface ReactiveDataGenerator<RawBox> {
    rawBox<V> (initialValue : V, name? : string) : RawBox
    box<V> (initialValue : V, name? : string) : BoxAbstract<V>

    rawComputed<V> (func : AnyFunction<V>, context? : any, name? : string) : RawBox
    computed<V> (func : AnyFunction<V>, context? : any, name? : string) : BoxAbstract<V>

    computedStrict<V> (func : AnyFunction<V>, context? : any, name? : string) : BoxAbstract<V>
}


//---------------------------------------------------------------------------------------------------------------------
export interface ReactiveDataGeneratorWithGenerators<RawBox> extends ReactiveDataGenerator<RawBox> {
    computedGen<V> (func : AnyFunction<Generator<any, V>>, context? : any, name? : string) : BoxAbstract<V>
}


//---------------------------------------------------------------------------------------------------------------------
export class ReactiveDataGeneratorMobx implements ReactiveDataGenerator<BoxMobxRaw<unknown>> {

    // used to measure the allocation performance
    rawBox<V> (initialValue : V, name? : string) : BoxMobx<unknown> {
        return observable.box(initialValue)
    }

    box<V> (initialValue : V, name? : string) : BoxMobx<V> {
        return new BoxMobx(observable.box(initialValue))
    }

    // used to measure the allocation performance
    rawComputed<V> (func : AnyFunction<V>, context? : any, name? : string) : BoxMobxRaw<unknown> {
        return computed(func, { keepAlive : true, context : context, name : name })
    }

    computed<V> (func : AnyFunction<V>, context? : any, name? : string) : BoxMobx<V> {
        return new BoxMobx(computed(func, { keepAlive : true, context : context, name : name }))
    }

    computedStrict<V> (func : AnyFunction<V>, context? : any, name? : string) : BoxMobx<V> {
        return new BoxMobx(computed(func, { keepAlive : true, context : context, name : name }))
    }
}

export const reactiveDataGeneratorMobx = new ReactiveDataGeneratorMobx()


//---------------------------------------------------------------------------------------------------------------------
export class ReactiveDataGeneratorChronoGraph2 extends Base implements ReactiveDataGeneratorWithGenerators<Box<unknown>> {

    // used to measure the allocation performance
    rawBox<V> (initialValue : V, name? : string) : Box<unknown> {
        return new Box(initialValue, name)
    }

    box<V> (initialValue : V, name? : string) : BoxChronoGraph2<V> {
        return new BoxChronoGraph2(new Box(initialValue, name))
    }


    // used to measure the allocation performance
    rawComputed<V> (func : AnyFunction<V>, context? : any, name? : string) : Box<unknown> {
        return new CalculableBox({ calculation : func, context : context, name : name })
    }

    computed<V> (func : AnyFunction<V>, context? : any, name? : string) : BoxChronoGraph2<V> {
        return new BoxChronoGraph2(new CalculableBox({ calculation : func, context : context, name : name }))
    }

    computedStrict<V> (func : AnyFunction<V>, context? : any, name? : string) : BoxChronoGraph2<V> {
        return new BoxChronoGraph2(new CalculableBox({ calculation : func, context : context, name : name, lazy : false }))
    }

    computedGen<V> (func : AnyFunction<Generator<any, V>>, context? : any, name? : string) : BoxChronoGraph2<V> {
        return new BoxChronoGraph2(new CalculableBoxGen({ calculation : func, context : context, name : name }))
    }
}

export const reactiveDataGeneratorChronoGraph2 = new ReactiveDataGeneratorChronoGraph2()


//---------------------------------------------------------------------------------------------------------------------
export type ReactiveDataGenerationResult  = { boxes : BoxAbstract<unknown>[], counter : number }


//---------------------------------------------------------------------------------------------------------------------
export type PostBenchInfo = {
    totalCount      : number
    result          : number
}


//---------------------------------------------------------------------------------------------------------------------
export class ReactiveDataBenchmark<
    StateT extends ReactiveDataGenerationResult = ReactiveDataGenerationResult,
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
        return `Total calculations: ${info.totalCount}\nResult in last box: ${info.result}`
    }
}


//---------------------------------------------------------------------------------------------------------------------
declare const window : any
declare const location : any

export const launchIfStandaloneProcess = <Res>(run : AnyFunction<Res>, moduleName : string) : Res => {
    if (
        typeof process !== undefined && process.version && String(process.argv[ 1 ]).includes(moduleName)
        || typeof window !== "undefined" && String(location.href).includes(moduleName)
    ) {
        return run()
    }
}
