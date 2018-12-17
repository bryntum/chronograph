import {ChronoBehavior, MinimalChronoBehavior, MinimalChronoMutationBox} from "../../src/chronograph/Mutation.js";
import {Base} from "../../src/class/Mixin.js";
import {Entity} from "../../src/replica/Entity.js";
import {MinimalReplica} from "../../src/replica/Replica.js";
import {ForeignKey, PrimaryKey, Schema} from "../../src/schema/Schema.js";

declare const StartTest : any


StartTest(t => {

    t.it('Replica', t => {
        const SomeSchema        = Schema.new({ name : 'Cool data schema' })

        const entity            = SomeSchema.getEntityDecorator()
        const field             = SomeSchema.getFieldDecorator()

        @entity
        class Author extends Entity(Base) {
            @field
            id              : string

            @field
            firstName       : string

            @field
            lastName        : string

            @field
            fullName        : string


            computeBehavior () : ChronoBehavior[] {
                return [
                    MinimalChronoBehavior.new({
                        input       : [],

                        calculation : () => {
                            return [
                                MinimalChronoMutationBox.new({
                                    input       : [ this.fields.firstName, this.fields.lastName ],
                                    output      : [ this.fields.fullName ],

                                    calculation : (firstName, lastName) => {
                                        return firstName + ' ' + lastName
                                    }
                                })
                            ]
                        }
                    })
                ]
            }
        }


        @entity
        class Book extends Entity(Base) {
            @field
            name            : string

            @field
            writtenBy       : Author
        }

        // Author.addPrimaryKey(PrimaryKey.new({
        //     fieldSet        : [ Author.getField('id') ]
        // }))
        //
        //
        // Book.addForeignKey(ForeignKey.new({
        //     fieldSet                : [ Book.getField('writtenBy') ],
        //     referencedFieldSet      : [ Author.getField('id') ],
        //
        //     referencedEntity        : Author.getEntity()
        // }))


        const replica1          = MinimalReplica.new({ schema : SomeSchema })

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
})
