var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Base } from "../../src/class/Mixin.js";
import { Entity } from "../../src/replica/Entity.js";
import { bucket, reference } from "../../src/replica/Reference.js";
import { MinimalReplica } from "../../src/replica/Replica.js";
import { Schema } from "../../src/schema/Schema.js";
StartTest(t => {
    t.it('Author/Book', async (t) => {
        const SomeSchema = Schema.new({ name: 'Cool data schema' });
        const entity = SomeSchema.getEntityDecorator();
        let Author = class Author extends Entity(Base) {
        };
        __decorate([
            bucket()
        ], Author.prototype, "books", void 0);
        Author = __decorate([
            entity
        ], Author);
        let Book = class Book extends Entity(Base) {
        };
        __decorate([
            reference({ bucket: 'books' })
        ], Book.prototype, "writtenBy", void 0);
        Book = __decorate([
            entity
        ], Book);
        const replica1 = MinimalReplica.new({ schema: SomeSchema });
        const markTwain = Author.new();
        const tomSoyer = Book.new({ writtenBy: markTwain });
        replica1.addEntity(markTwain);
        replica1.addEntity(tomSoyer);
        await replica1.propagate();
        t.isDeeply(markTwain.books, new Set([tomSoyer]), 'Correctly resolved reference');
        t.isDeeply(markTwain.$.books.incoming, new Set([tomSoyer.$$]), 'Correctly build incoming edges');
        const tomSoyer2 = Book.new({ writtenBy: markTwain });
        replica1.addEntity(tomSoyer2);
        await replica1.propagate();
        t.isDeeply(markTwain.books, new Set([tomSoyer, tomSoyer2]), 'Correctly resolved reference');
        tomSoyer2.writtenBy = null;
        await replica1.propagate();
        t.isDeeply(markTwain.books, new Set([tomSoyer]), 'Correctly resolved reference');
    });
    t.it('TreeNode', async (t) => {
        const SomeSchema = Schema.new({ name: 'Cool data schema' });
        const entity = SomeSchema.getEntityDecorator();
        let TreeNode = class TreeNode extends Entity(Base) {
        };
        __decorate([
            bucket()
        ], TreeNode.prototype, "children", void 0);
        __decorate([
            reference({ bucket: 'children' })
        ], TreeNode.prototype, "parent", void 0);
        TreeNode = __decorate([
            entity
        ], TreeNode);
        const replica1 = MinimalReplica.new({ schema: SomeSchema });
        const node1 = TreeNode.new();
        const node2 = TreeNode.new({ parent: node1 });
        const node3 = TreeNode.new({ parent: node1 });
        const node4 = TreeNode.new({ parent: node2 });
        replica1.addEntities([node1, node2, node3, node4]);
        await replica1.propagate();
        t.isDeeply(node1.children, new Set([node2, node3]), 'Correctly resolved `children` reference');
        t.isDeeply(node2.children, new Set([node4]), 'Correctly resolved `children` reference');
        t.isDeeply(node3.children, new Set(), 'Correctly resolved `children` reference');
        t.isDeeply(node4.children, new Set(), 'Correctly resolved `children` reference');
    });
});
