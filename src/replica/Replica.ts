import { ChronoGraph, MinimalChronoGraph } from "../chrono/Graph.js"
import { instanceOf } from "../class/InstanceOf.js"
import { AnyConstructor, Mixin } from "../class/Mixin.js"
import { Schema } from "../schema/Schema.js"
import { Entity } from "./Entity.js"

//---------------------------------------------------------------------------------------------------------------------
export const Replica = instanceOf(<T extends AnyConstructor<ChronoGraph>>(base : T) =>

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

    // async tryPropagateWithEntities (onEffect? : EffectResolverFunction, entities? : Entity[], hatchFn? : Function) : Promise<PropagationResult> {
    //
    //     if (entities && entities.length) {
    //         entities = entities.filter(e => e.$$.graph !== this)
    //         this.addEntities(entities)
    //     }
    //
    //     const result = await this.propagate(onEffect, hatchFn || true)
    //
    //     if (entities && entities.length) {
    //         this.removeEntities(entities)
    //     }
    //
    //     return result
    // }
})

export type Replica = Mixin<typeof Replica>

export interface ReplicaI extends Replica {}

export class MinimalReplica extends Replica(MinimalChronoGraph) {}
