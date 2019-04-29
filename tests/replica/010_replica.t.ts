import { ChronoIterator } from "../../src/chrono/Atom.js"
import { Base } from "../../src/class/Mixin.js"
import { calculate, Entity, field } from "../../src/replica/Entity.js"
import { MinimalReplica } from "../../src/replica/Replica.js"
import { Schema } from "../../src/schema/Schema.js"

declare const StartTest : any

StartTest(t => {

    t.it('Replica', async t => {
        const SomeSchema        = Schema.new({ name : 'Cool data schema' })

        const entity            = SomeSchema.getEntityDecorator()

        @entity
        class Author extends Entity(Base) {
            @field()
            id              : string

            @field()
            firstName       : string

            @field()
            lastName        : string

            @field()
            fullName        : string


            @calculate('fullName')
            * calculateFullName (proposed : string) : ChronoIterator<string> {
                return (yield this.$.firstName) + ' ' + (yield this.$.lastName)
            }
        }

        @entity
        class Book extends Entity(Base) {
            @field()
            name            : string

            @field()
            writtenBy       : Author
        }


        const replica1          = MinimalReplica.new({ schema : SomeSchema })

        const markTwain         = Author.new({ firstName : 'Mark', lastName : 'Twain' })
        const tomSoyer          = Book.new({ name : 'Tom Soyer', writtenBy : markTwain })

        replica1.addEntity(markTwain)
        replica1.addEntity(tomSoyer)

        await replica1.propagate()

        t.is(markTwain.fullName, 'Mark Twain', 'Correct name calculated')

        markTwain.firstName     = 'MARK'

        await replica1.propagate()

        t.is(markTwain.fullName, 'MARK Twain', 'Correct name calculated')
    })


    // TODO
    t.xit('Alternative atom yielding', async t => {

        class Author extends Entity(Base) {
            @field()
            id              : string

            @field()
            firstName       : string

            @field()
            lastName        : string

            @field()
            fullName        : string


            @calculate('fullName')
            * calculateFullName (proposed : string) : ChronoIterator<string> {
                return (yield* this.resolve('firstName')) + ' ' + (yield* this.resolve('lastName'))
            }
        }

        class Book extends Entity(Base) {
            @field()
            namez            : string

            @field()
            writtenBy       : Author
        }


        const replica1          = MinimalReplica.new()

        const markTwain         = Author.new({ firstName : 'Mark', lastName : 'Twain' })
        const tomSoyer          = Book.new({ namez : 'Tom Soyer', writtenBy : markTwain })

        replica1.addEntity(markTwain)
        replica1.addEntity(tomSoyer)

        await replica1.propagate()

        t.is(markTwain.fullName, 'Mark Twain', 'Correct name calculated')

        markTwain.firstName     = 'MARK'

        await replica1.propagate()

        t.is(markTwain.fullName, 'MARK Twain', 'Correct name calculated')
    })



    t.it('Helper methods', async t => {

        class Author extends Entity(Base) {
            @field()
            firstName       : string

            @field()
            lastName        : string

            @field()
            fullName        : string


            @calculate('fullName')
            * calculateFullName (proposed : string) : ChronoIterator<string> {
                return (yield this.$.firstName) + ' ' + (yield this.$.lastName)
            }


            * helperMethod (prefix : string) : ChronoIterator<string> {
                return prefix + (yield this.$.fullName)
            }
        }

        const replica1          = MinimalReplica.new()

        const markTwain         = Author.new({ firstName : 'Mark', lastName : 'Twain' })

        replica1.addEntity(markTwain)

        await replica1.propagate()

        t.is(markTwain.fullName, 'Mark Twain', 'Correct name calculated')

        // @ts-ignore
        const result            = markTwain.run('helperMethod', 'Mr. ')

        t.is(result, 'Mr. Mark Twain', 'Correct result from helper method')


        // TODO should walk depth on every "markAsNeedRecalculation" ?

        // markTwain.firstName     = 'MARK'
        //
        // t.throwsOk(
        //     () => {
        //         markTwain.run('helperMethod', 'Mr. ')
        //     },
        //     'stale'
        // )
    })

})
