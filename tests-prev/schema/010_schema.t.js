var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Base } from "../../src/class/Mixin.js";
import { MinimalFieldAtom } from "../../src/replica/Atom.js";
import { Entity, field } from "../../src/replica/Entity.js";
import { Schema } from "../../src/schema/Schema.js";
StartTest(t => {
    t.it('Minimal Schema', t => {
        const SomeSchema = Schema.new({ name: 'Cool data schema' });
        const entity = SomeSchema.getEntityDecorator();
        let SomeEntity = class SomeEntity extends Entity(Base) {
            constructor() {
                super(...arguments);
                this.someField1 = 'someField';
                this.someField2 = 11;
                this.someField3 = new Date(2018, 11, 11);
            }
        };
        __decorate([
            field()
        ], SomeEntity.prototype, "someField1", void 0);
        __decorate([
            field()
        ], SomeEntity.prototype, "someField2", void 0);
        __decorate([
            field()
        ], SomeEntity.prototype, "someField3", void 0);
        SomeEntity = __decorate([
            entity
        ], SomeEntity);
        const entity1 = SomeEntity.new();
        t.is(entity1.someField1, 'someField', 'Entity behaves as regular class');
        t.is(entity1.someField2, 11, 'Entity behaves as regular class');
        t.is(entity1.someField3, new Date(2018, 11, 11), 'Entity behaves as regular class');
        t.ok(SomeSchema.hasEntity('SomeEntity'), 'Entity has been created in the schema');
        const ent = SomeSchema.getEntity('SomeEntity');
        t.ok(ent.hasField('someField1'), 'Field has been created in the entity');
        t.ok(ent.hasField('someField2'), 'Field has been created in the entity');
        t.ok(ent.hasField('someField3'), 'Field has been created in the entity');
        t.isInstanceOf(entity1.$.someField1, MinimalFieldAtom);
        t.is(entity1.$.someField1.field, ent.getField('someField1'));
    });
});
