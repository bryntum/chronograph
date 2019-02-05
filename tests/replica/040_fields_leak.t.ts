import {Base} from "../../src/class/Mixin.js";
import {EntityAny, field} from "../../src/replica/Entity.js";

declare const StartTest : any

StartTest(t => {

    t.it('Child class fields should stay at child level', async t => {

        class Vehicle extends EntityAny(Base) {
            @field
            name : string
        }

        class Car extends Vehicle {
            @field
            drivingWheel : boolean = true
        }

        class Boat extends Vehicle {
            @field
            helm : boolean = true
        }

        const VehicleProto = Vehicle.prototype
        const CarProto = Car.prototype
        const BoatProto = Boat.prototype

        const VehicleFields = []

        VehicleProto.$entity.forEachField((_, name) => {
            VehicleFields.push(name)
        })


        const CarFields = []

        CarProto.$entity.forEachField((_, name) => {
            CarFields.push(name)
        })


        const BoatFields = []

        BoatProto.$entity.forEachField((_, name) => {
            BoatFields.push(name)
        })

        t.ok(VehicleFields.includes('name') && !VehicleFields.includes('drivingWheel') && !VehicleFields.includes('helm'), "Vehicle fields are ok")
        t.ok(CarFields.includes('name') && CarFields.includes('drivingWheel') && !CarFields.includes('helm'), "Car fields are ok")
        t.ok(BoatFields.includes('name') && BoatFields.includes('helm') && !BoatFields.includes('drivingWheel'), "Boat fields are ok")
    })
})
