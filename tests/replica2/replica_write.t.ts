import { CalculationIterator } from "../../src/chrono2/CalculationMode.js"
import { Base } from "../../src/class/Base.js"
import { FieldBox } from "../../src/replica2/Atom.js"
import { calculate, Entity, field, write } from "../../src/replica2/Entity.js"
import { Replica } from "../../src/replica2/Replica.js"
import { Schema } from "../../src/schema2/Schema.js"
import { uppercaseFirst } from "../../src/util/Helpers.js"

declare const StartTest : any

StartTest(t => {

    t.it('Entity with field calculation methods, gen', async t => {
        const schema            = Schema.new({ name : 'Cool data schema' })

        const entity            = schema.getEntityDecorator()

        const replica1          = Replica.new({ schema : schema })

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

            @write<Author>('firstName')
            writeFirstName (me : FieldBox, value : string) {
                me.write(uppercaseFirst(value))
            }

            @write<Author>('lastName')
            writeLastName (me : FieldBox, value : string) {
                me.write(uppercaseFirst(value))
            }
        }

        const markTwain         = Author.new({ firstName : 'mark', lastName : 'twain' })

        replica1.addEntity(markTwain)

        t.is(markTwain.firstName, 'Mark', 'Correct first name calculated')
        t.is(markTwain.lastName, 'Twain', 'Correct last name calculated')
        t.is(markTwain.fullName, 'Mark Twain', 'Correct full name calculated')

        markTwain.firstName     = 'mARK'

        t.is(markTwain.firstName, 'MARK', 'Correct first name calculated')
        t.is(markTwain.fullName, 'MARK Twain', 'Correct full name calculated')
    })
})
