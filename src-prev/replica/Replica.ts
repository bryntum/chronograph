import { ChronoAtom, ChronoAtomI } from "../chrono/Atom.js"
import { EffectResolverFunction } from "../chrono/Effect.js"
import { ChronoGraph, MinimalChronoGraph, PropagationResult } from "../chrono/Graph.js"
import { AnyConstructor, Mixin } from "../class/Mixin.js"
import { Schema } from "../schema/Schema.js"
import { Entity } from "./Entity.js"

const hasReplica = Symbol('isReplica')

//---------------------------------------------------------------------------------------------------------------------
export const Replica = <T extends AnyConstructor<ChronoGraph>>(base : T) =>

class Replica extends base {
    [hasReplica] () {}

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

    async tryPropagateWithEntities (onEffect? : EffectResolverFunction, entities? : Entity[], hatchFn? : Function) : Promise<PropagationResult> {

        if (entities && entities.length) {
            entities = entities.filter(e => e.$$.graph !== this)
            this.addEntities(entities)
        }

        const result = await this.propagate(onEffect, hatchFn || true)

        if (entities && entities.length) {
            this.removeEntities(entities)
        }

        return result
    }
}

export type Replica = Mixin<typeof Replica>

export class MinimalReplica extends Replica(MinimalChronoGraph) {
    nodeT                   : ChronoAtomI
}

export const isReplica = (replica : any) : replica is Replica => Boolean(replica && replica[hasReplica])
