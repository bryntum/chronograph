import { ChronoGraph as ChronoGraph1 } from "../../../src/chrono/Graph.js"
import { CalculatedValueGen, CalculatedValueSync, Identifier, VariableC } from "../../../src/chrono/Identifier.js"
import { Box } from "../../../src/chrono2/data/Box.js"
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
    commit ()

    reject ()

    undo ()

    redo ()
}


//---------------------------------------------------------------------------------------------------------------------
export class BoxChronoGraph1<V> extends BoxAbstract<V> {
    box             : Identifier<V>     = undefined
    graph           : ChronoGraph1      = undefined

    constructor (identifier, graph) {
        super()

        this.box        = identifier
        this.graph      = graph
    }

    READ () : V {
        return this.graph.read(this.box)
    }
    WRITE (value : V) {
        return this.graph.write(this.box, value)
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class ReactiveDataGeneratorChronoGraph2WithGraph extends ReactiveDataGeneratorChronoGraph2 {
    graph           : ChronoGraph2  = ChronoGraph2.new({ historyLimit : 0 })

    // used to measure the allocation performance
    rawBox<V> (initialValue : V, name? : string) : Box<unknown> {
        const box = super.rawBox(initialValue, name)

        this.graph.addAtom(box)

        return box
    }

    box<V> (initialValue : V, name? : string) : BoxChronoGraph2<V> {
        const box = super.box(initialValue, name)

        this.graph.addAtom(box.box)

        return box
    }

    // used to measure the allocation performance
    rawComputed<V> (func : AnyFunction<V>, context? : any, name? : string) : Box<unknown> {
        const box = super.rawComputed(func, context, name)

        this.graph.addAtom(box)

        return box
    }

    computed<V> (func : AnyFunction<V>, context? : any, name? : string) : BoxChronoGraph2<V> {
        const box = super.computed(func, context, name)

        this.graph.addAtom(box.box)

        return box
    }


    computedStrict<V> (func : AnyFunction<V>, context? : any, name? : string) : BoxChronoGraph2<V> {
        const box = super.computedStrict(func, context, name)

        this.graph.addAtom(box.box)

        return box
    }


    computedGen<V> (func : AnyFunction<Generator<any, V>>, context? : any, name? : string) : BoxChronoGraph2<V> {
        const box = super.computedGen(func, context, name)

        this.graph.addAtom(box.box)

        return box
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class ReactiveDataGeneratorChronoGraph1 extends Base implements ReactiveDataGeneratorWithGenerators<Identifier> {
    graph           : ChronoGraph1  = ChronoGraph1.new()

    // used to measure the allocation performance
    rawBox<V> (initialValue : V, name? : string) : Identifier {
        const box = VariableC({ name })

        this.graph.addIdentifier(box, initialValue)

        return box
    }

    box<V> (initialValue : V, name? : string) : BoxChronoGraph1<V> {
        const box = VariableC({ name })

        this.graph.addIdentifier(box, initialValue)

        return new BoxChronoGraph1(box, this.graph)
    }


    // used to measure the allocation performance
    rawComputed<V> (func : AnyFunction<V>, context? : any, name? : string) : Identifier {
        const box = CalculatedValueSync.new({ calculation : func, context : context, name : name })

        this.graph.addIdentifier(box)

        return box
    }

    computed<V> (func : AnyFunction<V>, context? : any, name? : string) : BoxChronoGraph1<V> {
        const box   = CalculatedValueSync.new({ calculation : func, context : context, name : name })

        this.graph.addIdentifier(box)

        return new BoxChronoGraph1(box, this.graph)
    }

    computedStrict<V> (func : AnyFunction<V>, context? : any, name? : string) : BoxChronoGraph1<V> {
        const box   = CalculatedValueSync.new({ calculation : func, context : context, name : name })

        this.graph.addIdentifier(box)

        return new BoxChronoGraph1(box, this.graph)
    }


    computedGen<V> (func : AnyFunction<Generator<any, V>>, context? : any, name? : string) : BoxChronoGraph1<V> {
        const box   = CalculatedValueGen.new({ calculation : func as any, context : context, name : name })

        this.graph.addIdentifier(box)

        return new BoxChronoGraph1(box, this.graph)
    }
}

//---------------------------------------------------------------------------------------------------------------------
export type ReactiveDataGenerationResultWithGraph = { boxes : BoxAbstract<unknown>[], counter : number, graph : AbstractGraph }


export interface ReactiveDataGeneratorWithGraph<RawBox> extends ReactiveDataGenerator<RawBox> {
    graph       : AbstractGraph
}
