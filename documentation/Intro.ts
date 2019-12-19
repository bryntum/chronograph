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
    }
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
const identifier10 = Identifier.new({
    equality : (v1 : Date, v2 : Date) => v1.getTime() === v2.getTime(),

    calculation (Y : SyncEffectHandler) : Date {
        return new Date(2020, 1, 1)
    },
}) as Identifier<Date>


//-----------------------------------
// example11
const variable11 : Variable<number> = graph.variable(5)
const variable12 : Variable<number> = graph.variable(5)

const identifier13 = graph.identifier(Y => Y(variable11) + Y(variable12))

const identifier14 = graph.identifier(Y => Y(identifier13) + 10)

const value14 = graph.read(identifier14)

graph.write(variable11, 3)
graph.write(variable12, 7)

// won't trigger the identifier14's calculation
const value15 = graph.read(identifier14)
