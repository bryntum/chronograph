import { Base } from "../../src/class/Base.js"
import { Entity } from "../../src/replica/Entity.js"

declare const StartTest : any

StartTest(t => {

    t.it('Entity, created lazily, subclass entry accessed first', async t => {
        class Author extends Entity.mix(Base) {
        }

        class SpecialAuthor extends Author {
        }

        t.notOk(Author.prototype.hasOwnProperty('$entity'), "Entity has not been created yet")
        t.notOk(SpecialAuthor.prototype.hasOwnProperty('$entity'), "Entity has not been created yet")

        t.ok(SpecialAuthor.getEntity(), "Entity has been created for the `SpecialAuthor` class")
        t.ok(Author.getEntity(), "Entity has been created for the `Author` class")

        t.is(SpecialAuthor.getEntity().parentEntity, Author.getEntity(), "Correct entity inheritance")
        t.is(Author.getEntity().parentEntity, null, "Correct entity inheritance")
    })


    t.it('Entity, created lazily, superclass entry accessed first', async t => {
        class Author extends Entity.mix(Base) {
        }

        class SpecialAuthor extends Author {
        }

        t.notOk(Author.prototype.hasOwnProperty('$entity'), "Entity has not been created yet")
        t.notOk(SpecialAuthor.prototype.hasOwnProperty('$entity'), "Entity has not been created yet")

        t.ok(Author.getEntity(), "Entity has been created for the `Author` class")
        t.ok(SpecialAuthor.getEntity(), "Entity has been created for the `SpecialAuthor` class")

        t.is(SpecialAuthor.getEntity().parentEntity, Author.getEntity(), "Correct entity inheritance")
        t.is(Author.getEntity().parentEntity, null, "Correct entity inheritance")
    })
})
