import { Base } from "../../src/class/Mixin.js";
import { Entity } from "../../src/replica/Entity.js";
import { bucket, reference } from "../../src/replica/Reference.js";
import { MinimalReplica } from "../../src/replica/Replica.js";

declare const StartTest : any

StartTest(t => {

    t.it('Resolver for reference should work', async t => {
        const authors       = new Map<string, Author>()

        class Author extends Entity(Base) {
            id          : string

            @bucket()
            books           : Set<Book>

            initialize () {
                super.initialize(...arguments)

                authors.set(this.id, this)
            }
        }

        class Book extends Entity(Base) {
            @reference({ bucket : 'books', resolver : locator => authors.get(locator) })
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


    t.it('Reference with resolver, without storage', async t => {
        const authors       = new Map<string, Author>()

        class Author extends Entity(Base) {
            id          : string

            initialize () {
                super.initialize(...arguments)

                authors.set(this.id, this)
            }
        }

        class Book extends Entity(Base) {
            @reference({ resolver : locator => authors.get(locator) })
            writtenBy       : Author | string
        }

        const replica           = MinimalReplica.new()

        const markTwain         = Author.new({ id : 'markTwain'})
        const tomSoyer          = Book.new({ writtenBy : 'markTwain' })

        replica.addEntity(markTwain)
        replica.addEntity(tomSoyer)

        await replica.propagate()

        t.is(tomSoyer.writtenBy, markTwain, 'Correctly resolved reference')
    })
})
