import {Base} from "../../src/class/Mixin.js";
import {MinimalFieldAtom} from "../../src/replica/Atom.js";
import {EntityAny, EntityBase, field} from "../../src/replica/Entity.js";
import {Schema} from "../../src/schema/Schema.js";

declare const StartTest : any


StartTest(t => {

    t.it('Minimal Schema', t => {

        const SomeSchema        = Schema.new({ name : 'Cool data schema' })

        const entity            = SomeSchema.getEntityDecorator()

        @entity
        class SomeEntity extends EntityBase(EntityAny(Base)) {

            @field
            someField1      : string        = 'someField'

            @field
            someField2      : number        = 11

            @field
            someField3      : Date          = new Date(2018, 11, 11)
        }


        const entity1       = SomeEntity.new()

        t.is(entity1.someField1, 'someField', 'Entity behaves as regular class')
        t.is(entity1.someField2, 11, 'Entity behaves as regular class')
        t.is(entity1.someField3, new Date(2018, 11, 11), 'Entity behaves as regular class')


        t.ok(SomeSchema.hasEntity('SomeEntity'), 'Entity has been created in the schema')

        const ent           = SomeSchema.getEntity('SomeEntity')

        t.ok(ent.hasField('someField1'), 'Field has been created in the entity')
        t.ok(ent.hasField('someField2'), 'Field has been created in the entity')
        t.ok(ent.hasField('someField3'), 'Field has been created in the entity')


        t.isInstanceOf(entity1.$.someField1, MinimalFieldAtom)
        t.is(entity1.$.someField1.field, ent.getField('someField1'))
    })


    // t.it('Relations', t => {
    //     const SomeSchema        = Schema.new({ name : 'Cool data schema' })
    //
    //     const entity            = SomeSchema.getEntityDecorator()
    //
    //     @entity
    //     class Author extends Entity(Base) {
    //         @field
    //         id              : string
    //
    //         @field
    //         name            : string
    //     }
    //
    //
    //     @entity
    //     class Book extends Entity(Base) {
    //         @field
    //         name            : string
    //
    //         @field
    //         writtenBy       : string
    //     }
    //
    //     Author.addPrimaryKey(PrimaryKey.new({
    //         fieldSet        : [ Author.getField('id') ]
    //     }))
    //
    //
    //     Book.addForeignKey(ForeignKey.new({
    //         referenceName           : 'writtenBy',
    //
    //         fieldSet                : [ Book.getField('writtenBy') ],
    //
    //         referencedFieldSet      : [ Author.getField('id') ],
    //         referencedEntity        : Author.getEntity()
    //     }))
    //
    // })
})
