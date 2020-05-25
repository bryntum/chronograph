import { Base } from "../../src/class/Base.js"
import { Entity, field } from "../../src/replica/Entity.js"
import { Name } from "../../src/schema/Field.js"

declare const StartTest : any

StartTest(t => {

    t.it('Child class fields should stay at child level', async t => {

       class Vehicle extends Entity.mix(Base) {
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

       Vehicle.$entity.forEachField(field => vehicleFields.add(field.name))
       Car.$entity.forEachField(field => carFields.add(field.name))
       Boat.$entity.forEachField(field => boatFields.add(field.name))

       t.isDeeply(vehicleFields, new Set([ 'name' ]), "Vehicle fields are ok")
       t.isDeeply(carFields, new Set([ 'name', 'drivingWheel' ]), "Car fields are ok")
       t.isDeeply(boatFields, new Set([ 'name', 'helm' ]), "Boat fields are ok")

       t.ok(Vehicle.$entity.hasField('name'), "Vehicle has own field")

       t.ok(Boat.$entity.hasField('name'), "Boat has inherited field")
       t.ok(Boat.$entity.hasField('helm'), "Boat has own field")

       t.ok(Car.$entity.hasField('name'), "Car has inherited field")
       t.ok(Car.$entity.hasField('drivingWheel'), "Car has own field")
   })
})
