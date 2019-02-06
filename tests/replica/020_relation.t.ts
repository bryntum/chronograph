import {Base} from "../../src/class/Mixin.js";
import {Entity} from "../../src/replica/Entity.js";
import {reference, storage} from "../../src/replica/Reference.js";
import {MinimalReplica} from "../../src/replica/Replica.js";
import {Schema} from "../../src/schema/Schema.js";

declare const StartTest : any

StartTest(t => {

    t.it('Replica', async t => {
        const SomeSchema        = Schema.new({ name : 'Cool data schema' })

        const entity            = SomeSchema.getEntityDecorator()

        @entity
        class Author extends Entity(Base) {
            @storage
            books           : Set<Book>
        }

        @entity
        class Book extends Entity(Base) {
            @reference('books')
            writtenBy       : Author
        }

        const replica1          = MinimalReplica.new({ schema : SomeSchema })

        const markTwain         = Author.new()
        const tomSoyer          = Book.new({ writtenBy : markTwain })

        replica1.addEntity(markTwain)
        replica1.addEntity(tomSoyer)

        await replica1.propagate()

        t.isDeeply(markTwain.books, new Set([ tomSoyer ]), 'Correctly resolved reference')

        t.isDeeply(markTwain.$.books.incoming, new Set([ tomSoyer.$$ ]), 'Correctly build incoming edges')

        const tomSoyer2         = Book.new({ writtenBy : markTwain })

        replica1.addEntity(tomSoyer2)

        await replica1.propagate()

        t.isDeeply(markTwain.books, new Set([ tomSoyer, tomSoyer2 ]), 'Correctly resolved reference')

        tomSoyer2.writtenBy     = null

        await replica1.propagate()

        t.isDeeply(markTwain.books, new Set([ tomSoyer ]), 'Correctly resolved reference')
    })
})
