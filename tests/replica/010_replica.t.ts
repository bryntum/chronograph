import { Base } from "../../src/class/Mixin.js"
import { CalculationIterator } from "../../src/primitives/Calculation.js"
import { calculate, Entity, field } from "../../src/replica/Entity.js"
import { MinimalReplica } from "../../src/replica/Replica.js"
import { Schema } from "../../src/schema/Schema.js"

declare const StartTest : any

StartTest(t => {

    t.it('Replica', async t => {
        const schema            = Schema.new({ name : 'Cool data schema' })

        const entity            = schema.getEntityDecorator()

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
            * calculateFullName () : CalculationIterator<string> {
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

        t.ok(schema.hasEntity('Author'), 'Entity added to schema')
        t.ok(schema.hasEntity('Book'), 'Entity added to schema')

        const replica1          = MinimalReplica.new({ schema : schema })

        const markTwain         = Author.new({ firstName : 'Mark', lastName : 'Twain' })
        const tomSoyer          = Book.new({ name : 'Tom Soyer', writtenBy : markTwain })

        replica1.addEntity(markTwain)
        replica1.addEntity(tomSoyer)

        replica1.propagate()

        t.is(markTwain.fullName, 'Mark Twain', 'Correct name calculated')

        markTwain.firstName     = 'MARK'

        replica1.propagate()

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
            * calculateFullName () : CalculationIterator<string> {
                return (yield this.$.firstName) + ' ' + (yield this.$.lastName)
            }


            * helperMethod (prefix : string) : CalculationIterator<string> {
                return prefix + (yield this.$.fullName)
            }
        }

        const replica1          = MinimalReplica.new()

        const markTwain         = Author.new({ firstName : 'Mark', lastName : 'Twain' })

        replica1.addEntity(markTwain)

        replica1.propagate()

        t.is(markTwain.fullName, 'Mark Twain', 'Correct name calculated')

        const result            = markTwain.run('helperMethod', 'Mr. ')

        t.is(result, 'Mr. Mark Twain', 'Correct result from helper method')
    })

})
