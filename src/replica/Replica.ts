import { ChronoGraph } from "../chrono/Graph.js"
import { ClassUnion, Mixin } from "../class/BetterMixin.js"
import { Schema } from "../schema/Schema.js"
import { Entity } from "./Entity.js"

//---------------------------------------------------------------------------------------------------------------------
export class Replica extends Mixin(
    [ ChronoGraph ],
    (base : ClassUnion<typeof ChronoGraph>) =>

class Replica extends base {
    schema              : Schema


    addEntity (entity : Entity) {
        entity.enterGraph(this)
    }


    addEntities (entities : Entity[]) {
        entities.forEach(entity => this.addEntity(entity))
    }


    removeEntity (entity : Entity) {
        entity.leaveGraph()
    }


    removeEntities (entities : Entity[]) {
        entities.forEach(entity => this.removeEntity(entity))
    }

}){}
