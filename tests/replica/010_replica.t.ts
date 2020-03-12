import { ProposedOrPrevious } from "../../src/chrono/Effect.js"
import { Base } from "../../src/class/BetterMixin.js"
import { CalculationIterator } from "../../src/primitives/Calculation.js"
import { calculate, Entity, field } from "../../src/replica/Entity.js"
import { Replica } from "../../src/replica/Replica.js"
import { Schema } from "../../src/schema/Schema.js"
import { delay } from "../../src/util/Helpers.js"

declare const StartTest : any

StartTest(t => {

    t.it('Replica', async t => {
        const schema            = Schema.new({ name : 'Cool data schema' })

        const entity            = schema.getEntityDecorator()

        @entity
        class Author extends Entity.mix(Base) {
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
        class Book extends Entity.mix(Base) {
            @field()
            name            : string

            @field()
            writtenBy       : Author
        }

        t.ok(schema.hasEntity('Author'), 'Entity added to schema')
        t.ok(schema.hasEntity('Book'), 'Entity added to schema')

        const replica1          = Replica.new({ schema : schema })

        const markTwain         = Author.new({ firstName : 'Mark', lastName : 'Twain' })
        const tomSoyer          = Book.new({ name : 'Tom Soyer', writtenBy : markTwain })

        replica1.addEntity(markTwain)
        replica1.addEntity(tomSoyer)

        t.is(markTwain.fullName, 'Mark Twain', 'Correct name calculated')

        markTwain.firstName     = 'MARK'

        t.is(markTwain.fullName, 'MARK Twain', 'Correct name calculated')
    })


    t.it('Simplified calculation methods', async t => {
        const schema            = Schema.new({ name : 'Cool data schema' })

        const entity            = schema.getEntityDecorator()

        @entity
        class Author extends Entity.mix(Base) {
            @field()
            firstName       : string

            @field()
            lastName        : string

            @field()
            fullName        : string


            @calculate('fullName')
            calculateFullName () : string {
                return this.firstName + ' ' + this.lastName
            }
        }

        const replica1          = Replica.new({ schema : schema })

        const markTwain         = Author.new({ firstName : 'Mark', lastName : 'Twain' })

        replica1.addEntity(markTwain)

        t.is(markTwain.fullName, 'Mark Twain', 'Correct name calculated')

        markTwain.firstName     = 'MARK'

        t.is(markTwain.fullName, 'MARK Twain', 'Correct name calculated')
    })


    t.it('Helper methods', async t => {

        class Author extends Entity.mix(Base) {
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

        const replica1          = Replica.new()

        const markTwain         = Author.new({ firstName : 'Mark', lastName : 'Twain' })

        replica1.addEntity(markTwain)

        t.is(markTwain.fullName, 'Mark Twain', 'Correct name calculated')

        const result            = markTwain.run('helperMethod', 'Mr. ')

        t.is(result, 'Mr. Mark Twain', 'Correct result from helper method')
    })


    t.it('Should set the variable fields to `null`', async t => {
        const schema            = Schema.new({ name : 'Cool data schema' })

        const entity            = schema.getEntityDecorator()

        @entity
        class Author extends Entity.mix(Base) {
            @field()
            firstName       : string

            @field()
            lastName        : string
        }

        const replica1          = Replica.new({ schema : schema })

        const markTwain         = Author.new({ lastName : 'Twain' })

        replica1.addEntity(markTwain)

        t.isStrict(markTwain.firstName, null, 'Correctly set uninitialized field to `null`')
        t.isStrict(markTwain.lastName, 'Twain', 'Correctly set config value')
    })


    t.it('Should set the uninitialized fields to `null` without recomputing them on next propagation', async t => {
        const schema            = Schema.new({ name : 'Cool data schema' })

        const entity            = schema.getEntityDecorator()

        @entity
        class Author extends Entity.mix(Base) {
            @field()
            firstName       : string

            @field()
            lastName        : string

            @calculate('firstName')
            calculateFirstName (Y) : string {
                return Y(ProposedOrPrevious)
            }

            @calculate('lastName')
            calculateLastName (Y) : string {
                return Y(ProposedOrPrevious)
            }

        }

        const replica1          = Replica.new({ schema : schema })

        const markTwain         = Author.new()

        replica1.addEntity(markTwain)

        //------------------
        const spy       = t.spyOn(markTwain.$.firstName, 'calculation')

        replica1.commit()

        t.expect(spy).toHaveBeenCalled(1)

        t.isStrict(markTwain.firstName, null, 'Correctly set uninitialized field to `null`')

        //------------------
        spy.reset()

        markTwain.lastName      = 'Twain'

        replica1.commit()

        t.expect(spy).toHaveBeenCalled(0)
    })


    t.it('Replica async', async t => {
        const schema            = Schema.new({ name : 'Cool data schema' })

        const entity            = schema.getEntityDecorator()

        @entity
        class Author extends Entity.mix(Base) {
            @field()
            id              : string

            @field()
            firstName       : string

            @field()
            lastName        : string

            @field({ sync : false })
            fullName        : string


            @calculate('fullName')
            * calculateFullName () : CalculationIterator<string> {
                yield delay(10)

                return (yield this.$.firstName) + ' ' + (yield this.$.lastName)
            }
        }

        const replica1          = Replica.new({ schema : schema, autoCommit : true, autoCommitMode : 'async', onWriteDuringCommit : 'ignore' })

        const markTwain         = Author.new({ firstName : 'Mark', lastName : 'Twain' })

        replica1.addEntity(markTwain)

        const fullName1         = markTwain.fullName

        t.isInstanceOf(fullName1, Promise)

        t.is(await markTwain.fullName, 'Mark Twain', 'Correct name calculated')

        // this write actually happens during the auto-commit, scheduled by the entity addition
        markTwain.firstName     = 'MARK'

        t.is(await markTwain.fullName, 'MARK Twain', 'Correct name calculated')
    })
})
