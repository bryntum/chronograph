import { Base } from "../../src/class/Mixin.js";
import { Entity, field } from "../../src/replica/Entity.js";
import { Name } from "../../src/schema/Field.js";

declare const StartTest : any

StartTest(t => {

    t.it('Child class fields should stay at child level', async t => {

        class Vehicle extends Entity(Base) {
            @field()
            name : string
        }

        class Car extends Vehicle {
            @field()
            drivingWheel : boolean = true
        }

        class Boat extends Vehicle {
            @field()
            helm : boolean = true
        }

        const vehicleFields         = new Set<Name>()
        const carFields             = new Set<Name>()
        const boatFields            = new Set<Name>()

        Vehicle.getEntity().forEachField(field => vehicleFields.add(field.name))
        Car.getEntity().forEachField(field => carFields.add(field.name))
        Boat.getEntity().forEachField(field => boatFields.add(field.name))

        t.isDeeply(vehicleFields, new Set([ 'name' ]), "Vehicle fields are ok")
        t.isDeeply(carFields, new Set([ 'name', 'drivingWheel' ]), "Car fields are ok")
        t.isDeeply(boatFields, new Set([ 'name', 'helm' ]), "Boat fields are ok")

        t.ok(Vehicle.getEntity().hasField('name'), "Vehicle has own field")

        t.ok(Boat.getEntity().hasField('name'), "Boat has inherited field")
        t.ok(Boat.getEntity().hasField('helm'), "Boat has own field")

        t.ok(Car.getEntity().hasField('name'), "Car has inherited field")
        t.ok(Car.getEntity().hasField('drivingWheel'), "Car has own field")

    })
})
