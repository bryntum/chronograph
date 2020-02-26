//-----------------------------------
import { ChronoGraph, ChronoIterator } from "../src/chrono/Graph.js"
import { ProposedOrCurrent } from "../src/chrono/Effect.js"
//-----------------------------------
// example3
// example1
import { Identifier, Variable } from "../src/chrono/Identifier.js"
//-----------------------------------
// example2
import { SyncEffectHandler } from "../src/chrono/Transaction.js"
import { CalculationIterator } from "../src/primitives/Calculation.js"
import { calculate, Entity, field } from "../src/replica/Entity.js"
import { reference } from "../src/replica/Reference.js"
import { bucket } from "../src/replica/ReferenceBucket.js"
import { Replica } from "../src/replica/Replica.js"

const identifier1 = Identifier.new({ calculation : () => 42 })


const identifier2 = Identifier.new({ calculation : (Y : SyncEffectHandler) => Y(identifier1) + 5 })


//-----------------------------------
// example3

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

const graph = ChronoGraph.new()

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
const variable11 : Variable<number> = graph.variable(5)
const variable12 : Variable<number> = graph.variable(5)

const identifier13 = graph.identifier(Y => Y(variable11) + Y(variable12))

const identifier14 = graph.identifier(Y => Y(identifier13) + 10)

const value14 = graph.read(identifier14)

graph.write(variable11, 3)
graph.write(variable12, 7)

// won't trigger the identifier14's calculation
const value15 = graph.read(identifier14)


//-----------------------------------
// example11
const identifier10 = Identifier.new({
    equality : (v1 : Date, v2 : Date) => v1.getTime() === v2.getTime(),

    calculation (Y : SyncEffectHandler) : Date {
        return new Date(2020, 1, 1)
    },
}) as Identifier<Date>


//-----------------------------------
// example12
const graph2 = ChronoGraph.new()

const variable13 : Variable<number> = graph2.variable(5)

const branch2 = graph2.branch()

branch2.write(variable13, 10)

const value13_1 = graph2.read(variable13)  // 5
const value13_2 = branch2.read(variable13) // 10


//-----------------------------------
// example13
const graph3 = ChronoGraph.new({ historyLimit : 5 })

const variable14 : Variable<number> = graph2.variable(5)

const value14_1 = graph2.read(variable14)  // 5

graph3.write(variable14, 10)

const value14_2 = graph2.read(variable14)  // 10

graph2.undo()

const value14_3 = graph2.read(variable14)  // 5

graph2.redo()

const value14_4 = graph2.read(variable14)  // 10


//-----------------------------------
// example14
const graph4 = ChronoGraph.new()

const max           = graph4.variable(100)

const identifier15  = graph4.identifier(function *calculation () : CalculationIterator<number> {
    const proposedValue : number    = yield ProposedOrCurrent

    const maxValue : number         = yield max

    return proposedValue <= maxValue ? proposedValue : maxValue
})

graph4.write(identifier15, 18)

const value15_1 = graph4.read(identifier15) // 18

graph4.write(identifier15, 180)

const value15_2 = graph4.read(identifier15) // 100

graph4.write(max, 50)

const value15_3 = graph4.read(identifier15) // 50


//-----------------------------------
// example15

class Author extends Entity.mix(Object) {
    @field()
    firstName       : string

    @field()
    lastName        : string

    @field()
    fullName        : string


    @calculate('fullName')
    calculateFullName (Y : SyncEffectHandler) : string {
        return Y(this.$.firstName) + ' ' + Y(this.$.lastName)
    }
}

const replica1          = Replica.new()

const markTwain         = new Author

replica1.addEntity(markTwain)

markTwain.firstName     = 'Mark'
markTwain.lastName      = 'Twain'

console.log(markTwain.fullName) // Mark Twain


//-----------------------------------
// example16

class Book extends Entity.mix(Object) {
    @field()
    writtenBy       : Author
}

const tomSawyer         = new Book

tomSawyer.writtenBy     = markTwain


//-----------------------------------
// example16

class Author2 extends Entity.mix(Object) {
    @bucket()
    books           : Set<Book2>
}

class Book2 extends Entity.mix(Object) {
    @reference({ bucket : 'books' })
    writtenBy       : Author2
}

const replica2          = Replica.new()

const markTwain2        = new Author2()

const tomSawyer2        = new Book2()
const huckleberryFinn2  = new Book2()

replica2.addEntities([ markTwain2, tomSawyer2, huckleberryFinn2 ])

tomSawyer2.writtenBy        = markTwain2
huckleberryFinn2.writtenBy  = markTwain2

markTwain2.books // new Set([ tomSawyer2, huckleberryFinn2 ])
