import { Base } from "../../src/class/Base.js"
import { FieldAtom } from "../../src/replica2/Atom.js"
import { Entity, field } from "../../src/replica2/Entity.js"
import { Schema } from "../../src/schema2/Schema.js"

declare const StartTest : any


StartTest(t => {

    t.it('Minimal Schema', t => {
        const schema            = Schema.new({ name : 'Cool data schema' })
        const entity            = schema.getEntityDecorator()

        @entity
        class SomeEntity extends Entity.mix(Base) {
            @field()
            someField1      : string        = 'someField'

            @field()
            someField2      : number        = 11

            @field()
            someField3      : Date          = new Date(2018, 11, 11)
        }

        //-------------------------
        const entity1       = SomeEntity.new()

        t.is(entity1.someField1, 'someField', 'Entity behaves as regular class')
        t.is(entity1.someField2, 11, 'Entity behaves as regular class')
        t.is(entity1.someField3, new Date(2018, 11, 11), 'Entity behaves as regular class')

        //-------------------------
        t.ok(schema.hasEntity('SomeEntity'), 'Entity has been created in the schema')

        const ent           = schema.getEntity('SomeEntity')

        t.ok(ent.hasField('someField1'), 'Field has been created in the entity')
        t.ok(ent.hasField('someField2'), 'Field has been created in the entity')
        t.ok(ent.hasField('someField3'), 'Field has been created in the entity')

        t.isInstanceOf(entity1.$.someField1, FieldAtom)
        t.is(entity1.$.someField1.field, ent.getField('someField1'))
    })
})
