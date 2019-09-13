import { Base } from "../../src/class/Mixin.js"
import { CalculationIterator } from "../../src/primitives/Calculation.js"
import { calculate, Entity, field } from "../../src/replica/Entity.js"
import { reference } from "../../src/replica/Reference.js"
import { bucket } from "../../src/replica/ReferenceBucket.js"
import { MinimalReplica } from "../../src/replica/Replica.js"
import { Schema } from "../../src/schema/Schema.js"

declare const StartTest : any

StartTest(t => {

    t.it('Author/Book', async t => {
        const SomeSchema        = Schema.new({ name : 'Cool data schema' })

        const entity            = SomeSchema.getEntityDecorator()

        @entity
        class Author extends Entity(Base) {
            @bucket()
            books           : Set<Book>
        }

        @entity
        class Book extends Entity(Base) {
            @reference({ bucket : 'books' })
            writtenBy       : Author
        }

        const replica1          = MinimalReplica.new({ schema : SomeSchema })

        const markTwain         = Author.new()
        const tomSoyer          = Book.new({ writtenBy : markTwain })

        replica1.addEntity(markTwain)
        replica1.addEntity(tomSoyer)

        replica1.propagate()

        t.isDeeply(markTwain.books, new Set([ tomSoyer ]), 'Correctly resolved reference')
        t.isDeeply(tomSoyer.writtenBy, markTwain, 'Correct reference value')

        const tomSoyer2         = Book.new({ writtenBy : markTwain })

        replica1.addEntity(tomSoyer2)

        replica1.propagate()

        t.isDeeply(markTwain.books, new Set([ tomSoyer, tomSoyer2 ]), 'Correctly resolved reference')

        tomSoyer2.writtenBy     = null

        replica1.propagate()

        t.isDeeply(markTwain.books, new Set([ tomSoyer ]), 'Correctly resolved reference')
    })


    t.it('TreeNode', async t => {
        const SomeSchema        = Schema.new({ name : 'Cool data schema' })

        const entity            = SomeSchema.getEntityDecorator()

        @entity
        class TreeNode extends Entity(Base) {
            @bucket()
            children            : Set<TreeNode>

            @reference({ bucket : 'children'})
            parent              : TreeNode
        }

        const replica1          = MinimalReplica.new({ schema : SomeSchema })

        const node1             = TreeNode.new()
        const node2             = TreeNode.new({ parent : node1 })
        const node3             = TreeNode.new({ parent : node1 })
        const node4             = TreeNode.new({ parent : node2 })

        replica1.addEntities([ node1, node2, node3, node4 ])

        replica1.propagate()

        t.isDeeply(node1.children, new Set([ node2, node3 ]), 'Correctly resolved `children` reference')
        t.isDeeply(node2.children, new Set([ node4 ]), 'Correctly resolved `children` reference')
        t.isDeeply(node3.children, new Set(), 'Correctly resolved `children` reference')
        t.isDeeply(node4.children, new Set(), 'Correctly resolved `children` reference')
    })


    t.it('Resolver for reference should work', async t => {
        const authors       = new Map<string, Author>()

        class Author extends Entity(Base) {
            id          : string

            @bucket()
            books           : Set<Book>

            initialize () {
                super.initialize(...arguments)

                authors.set(this.id, this)
            }
        }

        class Book extends Entity(Base) {
            @reference({ bucket : 'books', resolver : locator => authors.get(locator) })
            writtenBy       : Author | string
        }

        const replica           = MinimalReplica.new()

        const markTwain         = Author.new({ id : 'markTwain'})
        const tomSoyer          = Book.new({ writtenBy : 'markTwain' })

        replica.addEntity(markTwain)
        replica.addEntity(tomSoyer)

        replica.propagate()

        t.isDeeply(markTwain.books, new Set([ tomSoyer ]), 'Correctly resolved reference')

        t.is(tomSoyer.writtenBy, markTwain, 'Correctly resolved reference')
    })



    t.it('Reference with resolver, without bucket', async t => {
        const authors       = new Map<string, Author>()

        class Author extends Entity(Base) {
            id          : string

            initialize () {
                super.initialize(...arguments)

                authors.set(this.id, this)
            }
        }

        class Book extends Entity(Base) {
            @reference({ resolver : locator => authors.get(locator) })
            writtenBy       : Author | string
        }

        const replica           = MinimalReplica.new()

        const markTwain         = Author.new({ id : 'markTwain'})
        const tomSoyer          = Book.new({ writtenBy : 'markTwain' })

        replica.addEntity(markTwain)
        replica.addEntity(tomSoyer)

        await replica.propagate()

        t.is(tomSoyer.writtenBy, markTwain, 'Correctly resolved reference')
    })


})
