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
StartTest(t => {
    t.it('Resolver for reference should work', async (t) => {
        const authors = new Map();
        class Author extends Entity(Base) {
            initialize() {
                super.initialize(...arguments);
                authors.set(this.id, this);
            }
        }
        __decorate([
            bucket()
        ], Author.prototype, "books", void 0);
        class Book extends Entity(Base) {
        }
        __decorate([
            reference({ bucket: 'books', resolver: locator => authors.get(locator) })
        ], Book.prototype, "writtenBy", void 0);
        const replica = MinimalReplica.new();
        const markTwain = Author.new({ id: 'markTwain' });
        const tomSoyer = Book.new({ writtenBy: 'markTwain' });
        replica.addEntity(markTwain);
        replica.addEntity(tomSoyer);
        await replica.propagate();
        t.isDeeply(markTwain.books, new Set([tomSoyer]), 'Correctly resolved reference');
        t.is(tomSoyer.writtenBy, markTwain, 'Correctly resolved reference');
    });
    t.it('Reference with resolver, without storage', async (t) => {
        const authors = new Map();
        class Author extends Entity(Base) {
            initialize() {
                super.initialize(...arguments);
                authors.set(this.id, this);
            }
        }
        class Book extends Entity(Base) {
        }
        __decorate([
            reference({ resolver: locator => authors.get(locator) })
        ], Book.prototype, "writtenBy", void 0);
        const replica = MinimalReplica.new();
        const markTwain = Author.new({ id: 'markTwain' });
        const tomSoyer = Book.new({ writtenBy: 'markTwain' });
        replica.addEntity(markTwain);
        replica.addEntity(tomSoyer);
        await replica.propagate();
        t.is(tomSoyer.writtenBy, markTwain, 'Correctly resolved reference');
    });
});
