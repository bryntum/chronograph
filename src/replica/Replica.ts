import {GraphBox, MinimalGraphBox} from "../chronograph/Graph.js";
import {Base, Constructable, Mixin} from "../class/Mixin.js";
import {Schema} from "../schema/Schema.js";
import {Entity} from "./Entity.js";


//---------------------------------------------------------------------------------------------------------------------
export const Replica = <T extends Constructable<Base>>(base : T) =>

class Replica extends base {
    graph               : GraphBox

    schema              : Schema


    initialize (...args) {
        super.initialize(...args)

        this.graph      = MinimalGraphBox.new()
    }


    addEntity (entity : Entity) {
        entity.joinGraph(this.graph)
    }


    addEntities (entities : Entity[]) {
        entities.forEach(entity => this.addEntity(entity))
    }


    propagate () {
        this.graph.propagate()
    }

}

export type Replica = Mixin<typeof Replica>

export const MinimalReplica     = Replica(Base)
export type MinimalReplica      = InstanceType<typeof MinimalReplica>
