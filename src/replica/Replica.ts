import {ChronoGraph, MinimalChronoGraph} from "../chrono/Graph.js";
import {Base, Constructable, Mixin} from "../class/Mixin.js";
import {Schema} from "../schema/Schema.js";
import {Entity} from "./Entity.js";


//---------------------------------------------------------------------------------------------------------------------
export const Replica = <T extends Constructable<Base>>(base : T) =>

class Replica extends base {
    graph               : ChronoGraph   = MinimalChronoGraph.new()

    schema              : Schema


    addEntity (entity : Entity) {
        entity.enterGraph(this.graph)
    }


    addEntities (entities : Entity[]) {
        entities.forEach(entity => this.addEntity(entity))
    }


    propagate () {
        this.graph.propagate()
    }

}

export type Replica = Mixin<typeof Replica>

export class MinimalReplica extends Replica(Base) {}
