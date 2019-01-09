import {ChronoGraph, MinimalChronoGraph} from "../chrono/Graph.js";
import {Constructable, Mixin} from "../class/Mixin.js";
import {Schema} from "../schema/Schema.js";
import {Entity} from "./Entity.js";


//---------------------------------------------------------------------------------------------------------------------
export const Replica = <T extends Constructable<ChronoGraph>>(base : T) =>

class Replica extends base {
    schema              : Schema


    addEntity (entity : Entity) {
        entity.enterGraph(this)
    }


    addEntities (entities : Entity[]) {
        entities.forEach(entity => this.addEntity(entity))
    }


    propagate () {
        this.propagate()
    }

}

export type Replica = Mixin<typeof Replica>

export class MinimalReplica extends Replica(MinimalChronoGraph) {}
