var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Base } from "../../src/class/Mixin.js";
import { calculate, Entity, field } from "../../src/replica/Entity.js";
import { reference } from "../../src/replica/Reference.js";
import { MinimalReplica } from "../../src/replica/Replica.js";
StartTest(t => {
    t.it('Self-atom calculation with additional dependency', async (t) => {
        class Some extends Entity(Base) {
            *calculateSelf() {
                yield this.$.value;
                return this;
            }
        }
        __decorate([
            field()
        ], Some.prototype, "value", void 0);
        class Another extends Entity(Base) {
            *calculateResult() {
                const some = yield this.$.some;
                return some.value.toUpperCase();
            }
        }
        __decorate([
            reference()
        ], Another.prototype, "some", void 0);
        __decorate([
            field()
        ], Another.prototype, "result", void 0);
        __decorate([
            calculate('result')
        ], Another.prototype, "calculateResult", null);
        const replica1 = MinimalReplica.new();
        const some = Some.new({ value: 'Mark' });
        const another = Another.new({ some: some });
        replica1.addEntities([some, another]);
        await replica1.propagate();
        t.is(another.result, 'MARK', 'Correct result calculated');
        some.value = 'Twain';
        await replica1.propagate();
        t.is(another.result, 'TWAIN', 'Correct result calculated');
    });
});
