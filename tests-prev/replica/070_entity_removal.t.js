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
    const SomeSchema = Schema.new();
    const entity = SomeSchema.getEntityDecorator();
    let Person = class Person extends Entity(Base) {
        *calculateFullName(proposed) {
            return (yield this.$.firstName) + ' ' + (yield this.$.lastName);
        }
    };
    __decorate([
        field()
    ], Person.prototype, "id", void 0);
    __decorate([
        field()
    ], Person.prototype, "firstName", void 0);
    __decorate([
        field()
    ], Person.prototype, "lastName", void 0);
    __decorate([
        field()
    ], Person.prototype, "fullName", void 0);
    __decorate([
        calculate('fullName')
    ], Person.prototype, "calculateFullName", null);
    Person = __decorate([
        entity
    ], Person);
    t.it('All entity atoms should be removed from the graph `need recalculations` atoms collections', t => {
        const replica1 = MinimalReplica.new({ schema: SomeSchema });
        const p1 = Person.new({ firstName: 'Ivan', lastName: 'Navi' });
        replica1.addEntity(p1);
        let allNeedRecalc = true;
        p1.forEachFieldAtom(a => allNeedRecalc = allNeedRecalc && replica1.isAtomNeedRecalculation(a));
        t.ok(allNeedRecalc, 'All entity atoms need recalculation initially');
        replica1.removeEntity(p1);
        allNeedRecalc = false;
        p1.forEachFieldAtom(a => allNeedRecalc = allNeedRecalc || replica1.isAtomNeedRecalculation(a));
        t.notOk(allNeedRecalc, 'None entity atoms need recalculation after entity removal from a replica');
    });
});
