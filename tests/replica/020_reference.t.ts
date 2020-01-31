import { Base } from "../../src/class/BetterMixin.js"
import { Entity, field } from "../../src/replica/Entity.js"
import { reference } from "../../src/replica/Reference.js"
import { bucket } from "../../src/replica/ReferenceBucket.js"
import { Replica } from "../../src/replica/Replica.js"
import { Schema } from "../../src/schema/Schema.js"

declare const StartTest : any

StartTest(t => {

    t.it('Author/Book', async t => {
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
        // replica1.commit()

        t.isDeeply(markTwain.books, new Set([ tomSoyer ]), 'Correctly filled bucket')
        t.isDeeply(tomSoyer.writtenBy, markTwain, 'Correct reference value')

        //--------------------
        const tomSoyer2         = Book.new({ writtenBy : markTwain })

        replica1.addEntity(tomSoyer2)

        // comment to see a failure related to the unordered processing of added/removed entries in the bucket
        // bucket should have a single, ordered queue for add/remove mutations instead of 2 props `newRefs`, `oldRefs`
        replica1.commit()

        t.isDeeply(markTwain.books, new Set([ tomSoyer, tomSoyer2 ]), 'Correctly resolved reference')

        //--------------------
        tomSoyer2.writtenBy     = null

        // replica1.commit()

        t.isDeeply(markTwain.books, new Set([ tomSoyer ]), 'Correctly resolved reference')

        //--------------------
        replica1.removeEntity(tomSoyer)

        // replica1.commit()

        t.isDeeply(markTwain.books, new Set(), 'Correctly resolved reference')
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

})
