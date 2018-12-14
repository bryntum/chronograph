import {Entity} from "../../src/meta/Entity.js";
import {Schema} from "../../src/schema/Schema.js";

declare const StartTest : any


StartTest(t => {

    t.it('Minimal Schema', t => {

        const SomeSchema        = Schema.new({ name : 'Cool data schema' })

        const entity            = SomeSchema.getEntityDecorator()
        const field             = SomeSchema.getFieldDecorator()


        @entity
        class SomeEntity extends Entity() {

            @field
            someField1      : string        = 'someField'

            @field
            someField2      : number        = 11

            @field
            someField3      : Date          = new Date(2018, 11, 11)
        }


        const entity1       = new SomeEntity()

        t.is(entity1.someField1, 'someField', 'Entity behaves as regular class')
        t.is(entity1.someField2, 11, 'Entity behaves as regular class')
        t.is(entity1.someField3, new Date(2018, 11, 11), 'Entity behaves as regular class')


        t.ok(SomeSchema.hasEntity('SomeEntity'), 'Entity has been created in the schema')

        const ent           = SomeSchema.getEntity('SomeEntity')

        t.ok(ent.hasField('someField1'), 'Field has been created in the entity')
        t.ok(ent.hasField('someField2'), 'Field has been created in the entity')
        t.ok(ent.hasField('someField3'), 'Field has been created in the entity')
    })

})
