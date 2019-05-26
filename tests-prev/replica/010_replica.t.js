var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Base } from "../../src/class/Mixin.js";
import { calculate, Entity, field } from "../../src/replica/Entity.js";
import { MinimalReplica } from "../../src/replica/Replica.js";
import { Schema } from "../../src/schema/Schema.js";
StartTest(t => {
    t.it('Replica', async (t) => {
        const SomeSchema = Schema.new({ name: 'Cool data schema' });
        const entity = SomeSchema.getEntityDecorator();
        let Author = class Author extends Entity(Base) {
            *calculateFullName(proposed) {
                return (yield this.$.firstName) + ' ' + (yield this.$.lastName);
            }
        };
        __decorate([
            field()
        ], Author.prototype, "id", void 0);
        __decorate([
            field()
        ], Author.prototype, "firstName", void 0);
        __decorate([
            field()
        ], Author.prototype, "lastName", void 0);
        __decorate([
            field()
        ], Author.prototype, "fullName", void 0);
        __decorate([
            calculate('fullName')
        ], Author.prototype, "calculateFullName", null);
        Author = __decorate([
            entity
        ], Author);
        let Book = class Book extends Entity(Base) {
        };
        __decorate([
            field()
        ], Book.prototype, "name", void 0);
        __decorate([
            field()
        ], Book.prototype, "writtenBy", void 0);
        Book = __decorate([
            entity
        ], Book);
        const replica1 = MinimalReplica.new({ schema: SomeSchema });
        const markTwain = Author.new({ firstName: 'Mark', lastName: 'Twain' });
        const tomSoyer = Book.new({ name: 'Tom Soyer', writtenBy: markTwain });
        replica1.addEntity(markTwain);
        replica1.addEntity(tomSoyer);
        await replica1.propagate();
        t.is(markTwain.fullName, 'Mark Twain', 'Correct name calculated');
        markTwain.firstName = 'MARK';
        await replica1.propagate();
        t.is(markTwain.fullName, 'MARK Twain', 'Correct name calculated');
    });
    // TODO
    // t.xit('Alternative atom yielding', async t => {
    //
    //     class Author extends Entity(Base) {
    //         @field()
    //         id              : string
    //
    //         @field()
    //         firstName       : string
    //
    //         @field()
    //         lastName        : string
    //
    //         @field()
    //         fullName        : string
    //
    //
    //         @calculate('fullName')
    //         * calculateFullName (proposed : string) : ChronoIterator<string> {
    //             return (yield* this.resolve('firstName')) + ' ' + (yield* this.resolve('lastName'))
    //         }
    //     }
    //
    //     class Book extends Entity(Base) {
    //         @field()
    //         namez            : string
    //
    //         @field()
    //         writtenBy       : Author
    //     }
    //
    //
    //     const replica1          = MinimalReplica.new()
    //
    //     const markTwain         = Author.new({ firstName : 'Mark', lastName : 'Twain' })
    //     const tomSoyer          = Book.new({ namez : 'Tom Soyer', writtenBy : markTwain })
    //
    //     replica1.addEntity(markTwain)
    //     replica1.addEntity(tomSoyer)
    //
    //     await replica1.propagate()
    //
    //     t.is(markTwain.fullName, 'Mark Twain', 'Correct name calculated')
    //
    //     markTwain.firstName     = 'MARK'
    //
    //     await replica1.propagate()
    //
    //     t.is(markTwain.fullName, 'MARK Twain', 'Correct name calculated')
    // })
    t.it('Helper methods', async (t) => {
        class Author extends Entity(Base) {
            *calculateFullName(proposed) {
                return (yield this.$.firstName) + ' ' + (yield this.$.lastName);
            }
            *helperMethod(prefix) {
                return prefix + (yield this.$.fullName);
            }
        }
        __decorate([
            field()
        ], Author.prototype, "firstName", void 0);
        __decorate([
            field()
        ], Author.prototype, "lastName", void 0);
        __decorate([
            field()
        ], Author.prototype, "fullName", void 0);
        __decorate([
            calculate('fullName')
        ], Author.prototype, "calculateFullName", null);
        const replica1 = MinimalReplica.new();
        const markTwain = Author.new({ firstName: 'Mark', lastName: 'Twain' });
        replica1.addEntity(markTwain);
        await replica1.propagate();
        t.is(markTwain.fullName, 'Mark Twain', 'Correct name calculated');
        // @ts-ignore
        const result = markTwain.run('helperMethod', 'Mr. ');
        t.is(result, 'Mr. Mark Twain', 'Correct result from helper method');
        // TODO should walk depth on every "markAsNeedRecalculation" ?
        // markTwain.firstName     = 'MARK'
        //
        // t.throwsOk(
        //     () => {
        //         markTwain.run('helperMethod', 'Mr. ')
        //     },
        //     'stale'
        // )
    });
});
