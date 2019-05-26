var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Base } from "../../src/class/Mixin.js";
import { Entity, field } from "../../src/replica/Entity.js";
StartTest(t => {
    t.it('Child class fields should stay at child level', async (t) => {
        class Vehicle extends Entity(Base) {
        }
        __decorate([
            field()
        ], Vehicle.prototype, "name", void 0);
        class Car extends Vehicle {
            constructor() {
                super(...arguments);
                this.drivingWheel = true;
            }
        }
        __decorate([
            field()
        ], Car.prototype, "drivingWheel", void 0);
        class Boat extends Vehicle {
            constructor() {
                super(...arguments);
                this.helm = true;
            }
        }
        __decorate([
            field()
        ], Boat.prototype, "helm", void 0);
        const vehicleFields = new Set();
        const carFields = new Set();
        const boatFields = new Set();
        Vehicle.getEntity().forEachField(field => vehicleFields.add(field.name));
        Car.getEntity().forEachField(field => carFields.add(field.name));
        Boat.getEntity().forEachField(field => boatFields.add(field.name));
        t.isDeeply(vehicleFields, new Set(['name']), "Vehicle fields are ok");
        t.isDeeply(carFields, new Set(['name', 'drivingWheel']), "Car fields are ok");
        t.isDeeply(boatFields, new Set(['name', 'helm']), "Boat fields are ok");
        t.ok(Vehicle.getEntity().hasField('name'), "Vehicle has own field");
        t.ok(Boat.getEntity().hasField('name'), "Boat has inherited field");
        t.ok(Boat.getEntity().hasField('helm'), "Boat has own field");
        t.ok(Car.getEntity().hasField('name'), "Car has inherited field");
        t.ok(Car.getEntity().hasField('drivingWheel'), "Car has own field");
    });
});
