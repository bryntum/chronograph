var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { MinimalChronoBehavior, MinimalChronoMutationBox } from "../../src/chronograph/Mutation.js";
import { Base } from "../../src/class/Mixin.js";
import { Entity, field } from "../../src/replica/Entity.js";
import { MinimalReplica } from "../../src/replica/Replica.js";
import { Schema } from "../../src/schema/Schema.js";
StartTest(t => {
    t.it('Replica', t => {
        const SomeSchema = Schema.new({ name: 'Cool data schema' });
        const entity = SomeSchema.getEntityDecorator();
        let Author = class Author extends Entity(Base) {
            computeBehavior() {
                return [
                    MinimalChronoBehavior.new({
                        input: [],
                        calculation: () => {
                            return [
                                MinimalChronoMutationBox.new({
                                    input: [this.fields.firstName, this.fields.lastName],
                                    output: [this.fields.fullName],
                                    calculation: (firstName, lastName) => {
                                        return firstName + ' ' + lastName;
                                    }
                                })
                            ];
                        }
                    })
                ];
            }
        };
        __decorate([
            field
        ], Author.prototype, "id", void 0);
        __decorate([
            field
        ], Author.prototype, "firstName", void 0);
        __decorate([
            field
        ], Author.prototype, "lastName", void 0);
        __decorate([
            field
        ], Author.prototype, "fullName", void 0);
        Author = __decorate([
            entity
        ], Author);
        let Book = class Book extends Entity(Base) {
        };
        __decorate([
            field
        ], Book.prototype, "name", void 0);
        __decorate([
            field
        ], Book.prototype, "writtenBy", void 0);
        Book = __decorate([
            entity
        ], Book);
        // Author.addPrimaryKey(PrimaryKey.new({
        //     fieldSet        : [ Author.getField('id') ]
        // }))
        //
        //
        // Book.addForeignKey(ForeignKey.new({
        //     fieldSet                : [ Book.getField('writtenBy') ],
        //     referencedFieldSet      : [ Author.getField('id') ],
        //
        //     referencedEntity        : Author.getEntity()
        // }))
        const replica1 = MinimalReplica.new({ schema: SomeSchema });
        const markTwain = Author.new({ firstName: 'Mark', lastName: 'Twain' });
        const tomSoyer = Book.new({ name: 'Tom Soyer', writtenBy: markTwain });
        replica1.addEntity(markTwain);
        replica1.addEntity(tomSoyer);
        replica1.propagate();
        t.is(markTwain.fullName, 'Mark Twain', 'Correct name calculated');
        markTwain.firstName = 'MARK';
        replica1.propagate();
        t.is(markTwain.fullName, 'MARK Twain', 'Correct name calculated');
    });
});
