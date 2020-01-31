import { Base } from "../../src/class/Mixin.js"
import { CalculationIterator } from "../../src/primitives/Calculation.js"
import { calculate, Entity, field } from "../../src/replica/Entity.js"
import { reference } from "../../src/replica/Reference.js"
import { bucket } from "../../src/replica/ReferenceBucket.js"
import { MinimalReplica } from "../../src/replica/Replica.js"
import { Schema } from "../../src/schema/Schema.js"

declare const StartTest : any

StartTest(t => {

    t.it('Author/Book', async t => {
        const SomeSchema        = Schema.new({ name : 'Cool data schema' })

        const entity            = SomeSchema.getEntityDecorator()

        @entity
        class Author extends Entity(Base) {
            @bucket()
            books           : Set<Book>

            @field()
            booksCount      : number


            @calculate('booksCount')
            * calculateBooksCount () : CalculationIterator<number> {
                const books : Set<Book>    = yield this.$.books

                return books.size
            }
        }

        @entity
        class Book extends Entity(Base) {
            @reference({ bucket : 'books' })
            writtenBy       : Author
        }

        const replica1          = MinimalReplica.new({ schema : SomeSchema })

        const markTwain         = Author.new()
        const tomSoyer          = Book.new({ writtenBy : markTwain })

        replica1.addEntity(markTwain)
        replica1.addEntity(tomSoyer)

        //--------------------
        replica1.commit()

        t.isDeeply(markTwain.books, new Set([ tomSoyer ]), 'Correctly filled bucket')
        t.isDeeply(tomSoyer.writtenBy, markTwain, 'Correct reference value')

        //--------------------
        const tomSoyer2         = Book.new({ writtenBy : markTwain })

        replica1.addEntity(tomSoyer2)

        // replica1.propagate({ calculateOnly : [ markTwain.$.booksCount ] })

        t.is(replica1.read(markTwain.$.booksCount), 2, 'Correctly taken new reference into account with `calculateOnly` option')
    })
})
