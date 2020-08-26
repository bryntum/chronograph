import { Base } from "../../src/class/Base.js"
import { Entity } from "../../src/replica/Entity.js"
import { entity } from "../../src/schema/Schema.js"

declare const StartTest : any

StartTest(t => {

    t.it('Entity, created lazily, subclass entry accessed first', async t => {
        class Author extends Entity.mix(Base) {
        }

        class SpecialAuthor extends Author {
        }

        t.notOk(Author.prototype.hasOwnProperty('$entity'), "Entity has not been created yet")
        t.notOk(SpecialAuthor.prototype.hasOwnProperty('$entity'), "Entity has not been created yet")

        // first access `$entity` of the subclass, then super
        t.ok(SpecialAuthor.$entity, "Entity has been created for the `SpecialAuthor` class")
        t.ok(Author.$entity, "Entity has been created for the `Author` class")

        t.is(SpecialAuthor.$entity.parentEntity, Author.$entity, "Correct entity inheritance")
        t.is(Author.$entity.parentEntity, null, "Correct entity inheritance")
    })


    t.it('Entity, created lazily, superclass entry accessed first', async t => {
        class Author extends Entity.mix(Base) {
        }

        class SpecialAuthor extends Author {
        }

        // first access `$entity` of the super, then sub
        t.notOk(Author.prototype.hasOwnProperty('$entity'), "Entity has not been created yet")
        t.notOk(SpecialAuthor.prototype.hasOwnProperty('$entity'), "Entity has not been created yet")

        t.ok(Author.$entity, "Entity has been created for the `Author` class")
        t.ok(SpecialAuthor.$entity, "Entity has been created for the `SpecialAuthor` class")

        t.is(SpecialAuthor.$entity.parentEntity, Author.$entity, "Correct entity inheritance")
        t.is(Author.$entity.parentEntity, null, "Correct entity inheritance")
    })


    t.it('Entity, created lazily, subclass entry accessed first, through instance', async t => {
        class Author extends Entity.mix(Base) {
        }

        class SpecialAuthor extends Author {
        }

        t.notOk(Author.prototype.hasOwnProperty('$entity'), "Entity has not been created yet")
        t.notOk(SpecialAuthor.prototype.hasOwnProperty('$entity'), "Entity has not been created yet")

        const specialAuthor = SpecialAuthor.new()
        const author        = Author.new()

        // first access `$entity` of the subclass, then super
        t.ok(specialAuthor.$entity, "Entity has been created for the `SpecialAuthor` class")
        t.ok(author.$entity, "Entity has been created for the `Author` class")

        t.is(specialAuthor.$entity.parentEntity, Author.$entity, "Correct entity inheritance")
        t.is(author.$entity.parentEntity, null, "Correct entity inheritance")
    })


    t.it('Entity, created lazily, subclass entry accessed first, through instance', async t => {
        @entity()
        class Author extends Entity.mix(Base) {
        }

        @entity()
        class SpecialAuthor extends Author {
        }

        // t.notOk(Author.prototype.hasOwnProperty('$entity'), "Entity has not been created yet")
        // t.notOk(SpecialAuthor.prototype.hasOwnProperty('$entity'), "Entity has not been created yet")

        const specialAuthor = SpecialAuthor.new()
        const author        = Author.new()

        // first access `$entity` of the super, then sub
        t.ok(author.$entity, "Entity has been created for the `Author` class")
        t.ok(specialAuthor.$entity, "Entity has been created for the `SpecialAuthor` class")

        t.is(specialAuthor.$entity.parentEntity, Author.$entity, "Correct entity inheritance")
        t.is(author.$entity.parentEntity, null, "Correct entity inheritance")
    })


})
