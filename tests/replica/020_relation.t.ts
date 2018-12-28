import {Base} from "../../src/class/Mixin.js";
import {Entity, field, reference, relation} from "../../src/replica/Entity.js";
import {MinimalReplica} from "../../src/replica/Replica.js";
import {Schema} from "../../src/schema/Schema.js";

declare const StartTest : any

StartTest(t => {

    t.it('Replica', t => {
        const SomeSchema        = Schema.new({ name : 'Cool data schema' })

        const entity            = SomeSchema.getEntityDecorator()

        @entity
        class Author extends Entity(Base) {
            // id = /author/$id/books
            @relation
            books           : Set<Book>
        }

        @entity
        class Book extends Entity(Base) {
            @reference(Author, 'books')
            writtenBy       : Author
        }

        const replica1          = MinimalReplica.new({ schema : SomeSchema })

        const markTwain         = Author.new()
        const tomSoyer          = Book.new({ writtenBy : markTwain })

        replica1.addEntity(markTwain)
        replica1.addEntity(tomSoyer)

        replica1.propagate()

        t.isDeeply(markTwain.books, new Set([ tomSoyer ]), 'Correctly resolved reference')

        const tomSoyer2         = Book.new({ writtenBy : markTwain })

        replica1.addEntity(tomSoyer2)

        replica1.propagate()

        console.log("Books ", Array.from(markTwain.books))

        t.isDeeply(markTwain.books, new Set([ tomSoyer, tomSoyer2 ]), 'Correctly resolved reference')
    })


    t.it('Replica', t => {
        const SomeSchema        = Schema.new({ name : 'Cool data schema' })

        const entity            = SomeSchema.getEntityDecorator()

        type Id = string

        @entity
        class Author extends Entity(Base) {
            @field
            id              : Id
        }

        @entity
        class Book extends Entity(Base) {
            @field
            name            : string

            @field
            writtenBy       : Id
        }

        // // Author.addPrimaryKey(PrimaryKey.new({
        // //     fieldSet        : [ Author.getField('id') ]
        // // }))
        // //
        // //
        // // Book.addForeignKey(ForeignKey.new({
        // //     fieldSet                : [ Book.getField('writtenBy') ],
        // //     referencedFieldSet      : [ Author.getField('id') ],
        // //
        // //     referencedEntity        : Author.getEntity()
        // // }))
        //
        // const replica1          = MinimalReplica.new({ schema : SomeSchema })
        //
        // const markTwain         = Author.new({ firstName : 'Mark', lastName : 'Twain' })
        // const tomSoyer          = Book.new({ name : 'Tom Soyer', writtenBy : markTwain })
        //
        // replica1.addEntity(markTwain)
        // replica1.addEntity(tomSoyer)
        //
        // replica1.propagate()
        //
        // t.is(markTwain.fullName, 'Mark Twain', 'Correct name calculated')
        //
        // markTwain.firstName     = 'MARK'
        //
        // replica1.propagate()
        //
        // t.is(markTwain.fullName, 'MARK Twain', 'Correct name calculated')
    })

})
