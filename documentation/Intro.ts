//-----------------------------------
// example1
import { Identifier, Variable } from "../src/chrono/Identifier.js"

const identifier1 = Identifier.new({ calculation : () => 42 })


//-----------------------------------
// example2
import { SyncEffectHandler } from "../src/chrono/Transaction.js"

const identifier2 = Identifier.new({ calculation : (Y : SyncEffectHandler) => Y(identifier1) + 5 })


//-----------------------------------
// example3
import { ChronoIterator, MinimalChronoGraph } from "../src/chrono/Graph.js"

const identifier3 = Identifier.new({
    *calculation  (Y : SyncEffectHandler) : ChronoIterator<number> {
        const value1 : number = yield identifier1

        return value1 + 5
    }
})


//-----------------------------------
// example4
const context = { identifier1, identifier2 }

const identifier4 = Identifier.new({
    calculation  (Y : SyncEffectHandler) : number {
        const value1 : number = Y(this.identifier1)

        return value1 + 5
    },
    context
})

const identifier5 = Identifier.new({
    *calculation  (Y : SyncEffectHandler) : ChronoIterator<number> {
        const value2 : number = yield this.identifier2

        return value2 + 5
    },
    context
})


//-----------------------------------
// example5
const identifier6 = Identifier.new({
    *calculation  (Y : SyncEffectHandler) : ChronoIterator<number> {
        const value1 : number = Y(identifier1)

        return value1 + 5
    },
})

const identifier7 = Identifier.new({
    calculation  (Y : SyncEffectHandler) : number {
        const value6 : number = Y(identifier6)

        return value6 + 5
    },
}) as Identifier<number>


//-----------------------------------
// example6

const graph = MinimalChronoGraph.new()

graph.addIdentifier(identifier1)

const value1 = graph.read(identifier1)


//-----------------------------------
// example7
const identifier8 = graph.identifier(() => 42)

const value8 = graph.read(identifier8)


//-----------------------------------
// example8
const variable9 : Variable<number> = graph.variable(42)

const value9 = graph.read(variable9)


//-----------------------------------
// example9
graph.write(variable9, 11)

const value10 = graph.read(variable9)

//-----------------------------------
// example10
// graph.write(variable9, 11)
//
// const value10 = graph.read(variable9)
