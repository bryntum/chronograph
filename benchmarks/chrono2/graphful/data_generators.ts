import { Box, BoxUnbound } from "../../../src/chrono2/data/Box.js"
import { CalculableBox, CalculableBoxUnbound } from "../../../src/chrono2/data/CalculableBox.js"
import { CalculableBoxGen, CalculableBoxGenUnbound } from "../../../src/chrono2/data/CalculableBoxGen.js"
import { ChronoGraph as ChronoGraph2 } from "../../../src/chrono2/graph/Graph.js"
import { Base } from "../../../src/class/Base.js"
import { AnyFunction } from "../../../src/class/Mixin.js"
import {
    BoxAbstract,
    BoxChronoGraph2,
    ReactiveDataGenerator,
    ReactiveDataGeneratorChronoGraph2,
    ReactiveDataGeneratorWithGenerators
} from "../graphless/data_generators.js"


export interface AbstractGraph {
    commit (...args : any[])

    reject ()

    undo ()

    redo ()
}


//---------------------------------------------------------------------------------------------------------------------
export class ReactiveDataGeneratorChronoGraph2WithGraph extends ReactiveDataGeneratorChronoGraph2 {
    graph           : ChronoGraph2  = ChronoGraph2.new({ historyLimit : 0 })

    // used to measure the allocation performance
    rawBox<V> (initialValue : V, name? : string) : Box<unknown> {
        const box = new BoxUnbound(initialValue, name)

        this.graph.addAtom(box)

        return box
    }

    box<V> (initialValue : V, name? : string) : BoxChronoGraph2<V> {
        const box = new BoxChronoGraph2<V>(new BoxUnbound<V>(initialValue, name))

        this.graph.addAtom(box.box)

        return box
    }

    // used to measure the allocation performance
    rawComputed<V> (func : AnyFunction<V>, context? : any, name? : string) : Box<unknown> {
        const box = new CalculableBoxUnbound<V>({ calculation : func, context : context, name : name })

        this.graph.addAtom(box)

        return box
    }

    computed<V> (func : AnyFunction<V>, context? : any, name? : string) : BoxChronoGraph2<V> {
        const box = new BoxChronoGraph2<V>(new CalculableBox<V>({ calculation : func, context : context, name : name }))

        this.graph.addAtom(box.box)

        return box
    }


    computedStrict<V> (func : AnyFunction<V>, context? : any, name? : string) : BoxChronoGraph2<V> {
        const box = new BoxChronoGraph2<V>(new CalculableBoxUnbound<V>({ calculation : func, context : context, name : name, lazy : false }))

        this.graph.addAtom(box.box)

        return box
    }


    computedGen<V> (func : AnyFunction<Generator<any, V>>, context? : any, name? : string) : BoxChronoGraph2<V> {
        const box = new BoxChronoGraph2<V>(new CalculableBoxGenUnbound<V>({ calculation : func, context : context, name : name, lazy : false }))

        this.graph.addAtom(box.box)

        return box
    }
}



//---------------------------------------------------------------------------------------------------------------------
export type ReactiveDataGenerationResultWithGraph = { boxes : BoxAbstract<unknown>[], counter : number, graph : AbstractGraph }


export interface ReactiveDataGeneratorWithGraph<RawBox> extends ReactiveDataGenerator<RawBox> {
    graph       : AbstractGraph
}
