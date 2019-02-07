import {Base} from "../../src/class/Mixin.js";
import {Entity, field} from "../../src/replica/Entity.js";
import {reference, resolver, storage} from "../../src/replica/Reference.js";
import {MinimalReplica} from "../../src/replica/Replica.js";
import {Schema} from "../../src/schema/Schema.js";

declare const StartTest : any

StartTest(t => {

    t.it('Resolver for reference should work', async t => {
        const authors       = new Map<string, Author>()

        class Author extends Entity(Base) {
            id          : string

            @storage
            books           : Set<Book>

            initialize () {
                super.initialize(...arguments)

                authors.set(this.id, this)
            }
        }

        class Book extends Entity(Base) {
            @resolver(locator => authors.get(locator))
            @reference('books')
            writtenBy       : Author | string
        }

        const replica           = MinimalReplica.new()

        const markTwain         = Author.new({ id : 'markTwain'})
        const tomSoyer          = Book.new({ writtenBy : 'markTwain' })

        replica.addEntity(markTwain)
        replica.addEntity(tomSoyer)

        await replica.propagate()

        t.isDeeply(markTwain.books, new Set([ tomSoyer ]), 'Correctly resolved reference')

        t.is(tomSoyer.writtenBy, markTwain, 'Correctly resolved reference')
    })


    // t.it('Resolver for reference should work', async t => {
    //     const SomeSchema        = Schema.new({ name : 'Cool data schema' })
    //     const entity            = SomeSchema.getEntityDecorator()
    //
    //     const authors       = new Map<string, Author>()
    //
    //     class Author extends Entity(Base) {
    //         id          : string
    //
    //         @storage
    //         books           : Set<Book>
    //
    //         initialize () {
    //             super.initialize(...arguments)
    //
    //             authors.set(this.id, this)
    //         }
    //     }
    //
    //     class Book extends Entity(Base) {
    //         @resolver(locator => authors.get(locator))
    //         @reference('books')
    //         writtenBy       : Author | string
    //     }
    //
    //
    //     @entity
    //     class Book2 extends Book {
    //     }
    //
    //
    //     const replica           = MinimalReplica.new()
    //
    //     const markTwain         = Author.new({ id : 'markTwain'})
    //     const tomSoyer          = Book2.new({ writtenBy : 'markTwain' })
    //
    //     replica.addEntity(markTwain)
    //     replica.addEntity(tomSoyer)
    //
    //     await replica.propagate()
    //
    //     t.isDeeply(markTwain.books, new Set([ tomSoyer ]), 'Correctly resolved reference')
    //
    //     t.is(tomSoyer.writtenBy, markTwain, 'Correctly resolved reference')
    // })


})
