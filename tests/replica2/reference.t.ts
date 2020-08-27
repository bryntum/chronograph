import { CalculationIterator } from "../../src/chrono2/CalculationMode.js"
import { Base } from "../../src/class/Base.js"
import { calculate, Entity, field } from "../../src/replica2/Entity.js"
import { reference } from "../../src/replica2/Reference.js"
import { bucket } from "../../src/replica2/ReferenceBucket.js"
import { Replica } from "../../src/replica2/Replica.js"
import { Schema } from "../../src/schema2/Schema.js"

declare const StartTest : any

StartTest(t => {

    t.iit('Author/Book no commits', async t => {
        const SomeSchema        = Schema.new({ name : 'Cool data schema' })

        const entity            = SomeSchema.getEntityDecorator()

        @entity
        class Author extends Entity.mix(Base) {
            @bucket()
            books           : Set<Book>     = undefined
        }

        @entity
        class Book extends Entity.mix(Base) {
            @reference({ bucket : 'books' })
            writtenBy       : Author        = undefined
        }

        const replica1          = Replica.new({ schema : SomeSchema })

        const markTwain         = Author.new()
        const tomSoyer          = Book.new({ writtenBy : markTwain })

        replica1.addEntity(markTwain)
        replica1.addEntity(tomSoyer)

        //--------------------
        t.isDeeply(markTwain.books, new Set([ tomSoyer ]), 'Correctly filled bucket')
        t.isDeeply(tomSoyer.writtenBy, markTwain, 'Correct reference value')

        // //--------------------
        // const tomSoyer2         = Book.new({ writtenBy : markTwain })
        //
        // replica1.addEntity(tomSoyer2)
        //
        // t.isDeeply(markTwain.books, new Set([ tomSoyer, tomSoyer2 ]), 'Correctly resolved reference #1')
        //
        // //--------------------
        // tomSoyer2.writtenBy     = null
        //
        // t.isDeeply(markTwain.books, new Set([ tomSoyer ]), 'Correctly resolved reference #2')
        //
        // //--------------------
        // replica1.removeEntity(tomSoyer)
        //
        // t.isDeeply(markTwain.books, new Set(), 'Correctly resolved reference #3')
        //
        // //--------------------
        // replica1.addEntity(tomSoyer)
        //
        // t.isDeeply(markTwain.books, new Set([ tomSoyer ]), 'Correctly resolved reference #4')
    })


    t.it('Author/Book with commits', async t => {
        const SomeSchema        = Schema.new({ name : 'Cool data schema' })

        const entity            = SomeSchema.getEntityDecorator()

        @entity
        class Author extends Entity.mix(Base) {
            @bucket()
            books           : Set<Book>
        }

        @entity
        class Book extends Entity.mix(Base) {
            @reference({ bucket : 'books' })
            writtenBy       : Author
        }

        const replica1          = Replica.new({ schema : SomeSchema })

        const markTwain         = Author.new()
        const tomSoyer          = Book.new({ writtenBy : markTwain })

        replica1.addEntity(markTwain)
        replica1.addEntity(tomSoyer)

        //--------------------
        replica1.commit()

        t.isDeeply(markTwain.books, new Set([ tomSoyer ]), 'Correctly filled bucket')
        t.isDeeply(tomSoyer.writtenBy, markTwain, 'Correct reference value')

        //--------------------
        const tomSoyer2         = Book.new({ writtenBy : markTwain })

        replica1.addEntity(tomSoyer2)

        // comment to see a failure related to the unordered processing of added/removed entries in the bucket
        // bucket should have a single, ordered queue for add/remove mutations instead of 2 props `newRefs`, `oldRefs`
        replica1.commit()

        t.isDeeply(markTwain.books, new Set([ tomSoyer, tomSoyer2 ]), 'Correctly resolved reference #1')

        //--------------------
        tomSoyer2.writtenBy     = null

        replica1.commit()

        t.isDeeply(markTwain.books, new Set([ tomSoyer ]), 'Correctly resolved reference #2')

        //--------------------
        replica1.removeEntity(tomSoyer)

        replica1.commit()

        t.isDeeply(markTwain.books, new Set(), 'Correctly resolved reference')

        //--------------------
        replica1.addEntity(tomSoyer)

        replica1.commit()

        t.isDeeply(markTwain.books, new Set([ tomSoyer ]), 'Correctly resolved reference')
    })


    t.it('Author/Book #2', async t => {
        const SomeSchema        = Schema.new({ name : 'Cool data schema' })

        const entity            = SomeSchema.getEntityDecorator()

        @entity
        class Author extends Entity.mix(Base) {
            @bucket()
            books           : Set<Book>
        }

        @entity
        class Book extends Entity.mix(Base) {
            @reference({ bucket : 'books' })
            writtenBy       : Author
        }

        const replica1          = Replica.new({ schema : SomeSchema })

        const markTwain         = Author.new()
        const markTwain2        = Author.new()
        const tomSoyer          = Book.new({ writtenBy : markTwain })

        replica1.addEntities([ markTwain, markTwain2, tomSoyer ])

        //--------------------
        replica1.commit()

        t.isDeeply(markTwain.books, new Set([ tomSoyer ]), 'Correctly resolved reference')
        t.isDeeply(markTwain2.books, new Set(), 'Correctly resolved reference')
        t.isDeeply(tomSoyer.writtenBy, markTwain, 'Correct reference value')

        //--------------------
        tomSoyer.writtenBy      = markTwain2

        // overwrite previous write
        tomSoyer.writtenBy      = markTwain

        replica1.commit()

        t.isDeeply(markTwain.books, new Set([ tomSoyer ]), 'Correctly resolved reference')
        t.isDeeply(markTwain2.books, new Set(), 'Correctly resolved reference')
        t.isDeeply(tomSoyer.writtenBy, markTwain, 'Correct reference value')

        //--------------------
        tomSoyer.writtenBy      = markTwain2

        // remove modified reference
        replica1.removeEntity(tomSoyer)

        replica1.commit()

        t.isDeeply(markTwain.books, new Set(), 'Correctly resolved reference')
        t.isDeeply(markTwain2.books, new Set(), 'Correctly resolved reference')
    })


    t.it('TreeNode', async t => {
        const SomeSchema        = Schema.new({ name : 'Cool data schema' })

        const entity            = SomeSchema.getEntityDecorator()

        @entity
        class TreeNode extends Entity.mix(Base) {
            @bucket()
            children            : Set<TreeNode>

            @reference({ bucket : 'children'})
            parent              : TreeNode
        }

        const replica1          = Replica.new({ schema : SomeSchema })

        const node1             = TreeNode.new()
        const node2             = TreeNode.new({ parent : node1 })
        const node3             = TreeNode.new({ parent : node1 })
        const node4             = TreeNode.new({ parent : node2 })

        replica1.addEntities([ node1, node2, node3, node4 ])

        replica1.commit()

        t.isDeeply(node1.children, new Set([ node2, node3 ]), 'Correctly resolved `children` reference')
        t.isDeeply(node2.children, new Set([ node4 ]), 'Correctly resolved `children` reference')
        t.isDeeply(node3.children, new Set(), 'Correctly resolved `children` reference')
        t.isDeeply(node4.children, new Set(), 'Correctly resolved `children` reference')
    })


    t.it('TreeNode w/o propagate', async t => {
        const SomeSchema        = Schema.new({ name : 'Cool data schema' })

        const entity            = SomeSchema.getEntityDecorator()

        @entity
        class TreeNode extends Entity.mix(Base) {
            @bucket()
            children            : Set<TreeNode>

            @reference({ bucket : 'children'})
            parent              : TreeNode
        }

        const replica1          = Replica.new({ schema : SomeSchema })
        const node1             = TreeNode.new()

        replica1.addEntity(node1)

        // early read to fill the bucket quark with value which needs to be overriden after adding other nodes
        t.isDeeply(node1.children, new Set([]), 'Correctly resolved `children` reference')

        const node2             = TreeNode.new({ parent : node1 })
        const node3             = TreeNode.new({ parent : node1 })
        const node4             = TreeNode.new({ parent : node2 })

        replica1.addEntities([ node2, node3, node4 ])

        t.isDeeply(node1.children, new Set([ node2, node3 ]), 'Correctly resolved `children` reference')
        t.isDeeply(node2.children, new Set([ node4 ]), 'Correctly resolved `children` reference')
        t.isDeeply(node3.children, new Set(), 'Correctly resolved `children` reference')
        t.isDeeply(node4.children, new Set(), 'Correctly resolved `children` reference')
    })


    t.it('Resolver for reference should work', async t => {
        const authors       = new Map<string, Author>()

        class Author extends Entity.mix(Base) {
            id          : string

            @bucket()
            books           : Set<Book>

            initialize () {
                super.initialize(...arguments)

                authors.set(this.id, this)
            }
        }

        class Book extends Entity.mix(Base) {
            @reference({ bucket : 'books', resolver : locator => authors.get(locator) })
            writtenBy       : Author | string

            @field()
            someField       : number
        }

        //------------------
        const replica           = Replica.new()

        const markTwain         = Author.new({ id : 'markTwain'})
        const tomSoyer          = Book.new({ writtenBy : 'markTwain' })

        replica.addEntity(markTwain)
        replica.addEntity(tomSoyer)

        //------------------
        const spy       = t.spyOn(tomSoyer.$.writtenBy, 'calculation')

        replica.commit()

        t.isDeeply(markTwain.books, new Set([ tomSoyer ]), 'Correctly resolved reference')

        t.is(tomSoyer.writtenBy, markTwain, 'Correctly resolved reference')

        //------------------
        spy.reset()

        tomSoyer.someField  = 11

        replica.commit()

        // the reference should be resolved at the proposed value stage, to not be recalculated again
        t.expect(spy).toHaveBeenCalled(0)
    })


    t.it('Reference with resolver, without bucket', async t => {
        const authors       = new Map<string, Author>()

        class Author extends Entity.mix(Base) {
            id          : string

            initialize () {
                super.initialize(...arguments)

                authors.set(this.id, this)
            }
        }

        class Book extends Entity.mix(Base) {
            @reference({ resolver : locator => authors.get(locator) })
            writtenBy       : Author | string
        }

        const replica           = Replica.new()

        const markTwain         = Author.new({ id : 'markTwain'})
        const tomSoyer          = Book.new({ writtenBy : 'markTwain' })

        replica.addEntity(markTwain)
        replica.addEntity(tomSoyer)

        replica.commit()

        t.is(tomSoyer.writtenBy, markTwain, 'Correctly resolved reference')
    })


    t.it('Mutual references with resolvers should work', async t => {
        const dictionary1       = new Map<string, Entity1>()
        const dictionary2       = new Map<string, Entity2>()

        class Entity1 extends Entity.mix(Base) {
            id              : string

            @bucket()
            referencedFromEntity2       : Set<Entity2>

            @reference({ bucket : 'referencedFromEntity1', resolver : locator => dictionary2.get(locator) })
            referencingEntity2          : Entity2 | string

            initialize () {
                super.initialize(...arguments)

                dictionary1.set(this.id, this)
            }
        }

        class Entity2 extends Entity.mix(Base) {
            id              : string

            @bucket()
            referencedFromEntity1       : Set<Entity2>

            @reference({ bucket : 'referencedFromEntity2', resolver : locator => dictionary1.get(locator) })
            referencingEntity1          : Entity1 | string

            initialize () {
                super.initialize(...arguments)

                dictionary2.set(this.id, this)
            }
        }

        const replica           = Replica.new()

        const entity1           = Entity1.new({ id : 'entity1', referencingEntity2 : 'entity2' })
        const entity2           = Entity2.new({ id : 'entity2', referencingEntity1 : 'entity1' })

        replica.addEntities([ entity1, entity2 ])

        replica.commit()

        t.isDeeply(entity1.referencingEntity2, entity2, 'Correctly resolved reference')
        t.isDeeply(entity2.referencingEntity1, entity1, 'Correctly resolved reference')

        t.isDeeply(entity1.referencedFromEntity2, new Set([ entity2 ]), 'Correctly resolved reference')
        t.isDeeply(entity2.referencedFromEntity1, new Set([ entity1 ]), 'Correctly resolved reference')
    })


    t.it('Removing an added entity w/o propagation should not throw exception', async t => {
        const SomeSchema        = Schema.new({ name : 'Cool data schema' })

        const entity            = SomeSchema.getEntityDecorator()

        @entity
        class Author extends Entity.mix(Base) {
            @bucket()
            books           : Set<Book>
        }

        @entity
        class Book extends Entity.mix(Base) {
            @reference({ bucket : 'books' })
            writtenBy       : Author
        }

        const replica1          = Replica.new({ schema : SomeSchema })

        const markTwain         = Author.new()
        const tomSoyer          = Book.new({ writtenBy : markTwain })

        replica1.addEntity(markTwain)
        replica1.addEntity(tomSoyer)

        // no propagation here, we test that no exception is thrown

        replica1.removeEntity(markTwain)
        replica1.removeEntity(tomSoyer)

        t.pass('No exception thrown')
    })


    t.it('Author/Book auto-commit', async t => {
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

            @bucket()
            books           : Set<Book>
        }

        class Book extends Entity.mix(Base) {
            @reference({ bucket : 'books' })
            writtenBy       : Author
        }

        const replica1          = Replica.new()

        const markTwain         = Author.new()
        const tomSoyer          = Book.new({ writtenBy : markTwain })

        t.is(replica1.hasPendingAutoCommit(), false, 'No pending commit')
        t.is(replica1.dirty, false, 'Replica is clean')

        replica1.addEntity(markTwain)

        t.is(replica1.hasPendingAutoCommit(), true, 'Pending commit after entity addition')
        t.is(replica1.dirty, true, 'Replica is dirty after adding an entity')

        replica1.addEntity(tomSoyer)

        await t.waitFor(() => !replica1.dirty)
        t.is(replica1.hasPendingAutoCommit(), false, 'No pending commit')

        //--------------------
        tomSoyer.writtenBy     = null

        t.is(replica1.hasPendingAutoCommit(), true, 'Pending commit')
        t.is(replica1.dirty, true, 'Replica is dirty')

        await t.waitFor(() => !replica1.dirty)
        t.is(replica1.hasPendingAutoCommit(), false, 'No pending commit')

        t.isDeeply(markTwain.books, new Set(), 'Correctly resolved reference')

        //--------------------
        replica1.removeEntity(tomSoyer)

        t.is(replica1.hasPendingAutoCommit(), true, 'Pending commit')
        t.is(replica1.dirty, true, 'Replica is dirty')

        await t.waitFor(() => !replica1.dirty)
        t.is(replica1.hasPendingAutoCommit(), false, 'No pending commit')
    })


    t.it('References should work correctly when reading from individual atom', async t => {
        const SomeSchema        = Schema.new({ name : 'Cool data schema' })

        const entity            = SomeSchema.getEntityDecorator()

        @entity
        class Author extends Entity.mix(Base) {
            @bucket()
            books           : Set<Book>

            @field()
            booksCount      : number


            @calculate('booksCount')
            * calculateBooksCount () : CalculationIterator<number> {
                const books : Set<Book>    = yield this.$.books

                return books.size
            }
        }

        @entity
        class Book extends Entity.mix(Base) {
            @reference({ bucket : 'books' })
            writtenBy       : Author
        }

        const replica1          = Replica.new({ schema : SomeSchema })

        const markTwain         = Author.new()
        const tomSoyer          = Book.new({ writtenBy : markTwain })

        replica1.addEntity(markTwain)
        replica1.addEntity(tomSoyer)

        //--------------------
        replica1.commit()

        t.isDeeply(markTwain.books, new Set([ tomSoyer ]), 'Correctly filled bucket')
        t.isDeeply(tomSoyer.writtenBy, markTwain, 'Correct reference value')

        //--------------------
        const tomSoyer2         = Book.new({ writtenBy : markTwain })

        replica1.addEntity(tomSoyer2)

        t.is(markTwain.$.booksCount.read(), 2, 'Correctly taken new reference into account when reading from individual atom instead of doing `commit`')
    })

})
