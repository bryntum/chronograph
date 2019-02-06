import {Base} from "../../src/class/Mixin.js";
import {Entity, field, generic_field} from "../../src/replica/Entity.js";
import {Field, Name} from "../../src/schema/Field.js";

declare const StartTest : any

StartTest(t => {

    t.it('Child class fields should stay at child level', async t => {

        class Vehicle extends Entity(Base) {
            @field
            name : string
        }

        class Car extends Vehicle {
            @generic_field(Field)
            drivingWheel : boolean = true
        }

        class Boat extends Vehicle {
            @field
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
    })
})
