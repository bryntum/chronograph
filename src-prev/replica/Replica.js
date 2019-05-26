import { MinimalChronoGraph } from "../chrono/Graph.js";
const hasReplica = Symbol('isReplica');
//---------------------------------------------------------------------------------------------------------------------
export const Replica = (base) => class Replica extends base {
    [hasReplica]() { }
    addEntity(entity) {
        entity.enterGraph(this);
    }
    addEntities(entities) {
        entities.forEach(entity => this.addEntity(entity));
    }
    removeEntity(entity) {
        entity.leaveGraph();
    }
    removeEntities(entities) {
        entities.forEach(entity => this.removeEntity(entity));
    }
    async tryPropagateWithEntities(onEffect, entities, hatchFn) {
        if (entities && entities.length) {
            entities = entities.filter(e => e.$$.graph !== this);
            this.addEntities(entities);
        }
        const result = await this.propagate(onEffect, hatchFn || true);
        if (entities && entities.length) {
            this.removeEntities(entities);
        }
        return result;
    }
};
export class MinimalReplica extends Replica(MinimalChronoGraph) {
}
export const isReplica = (replica) => Boolean(replica && replica[hasReplica]);
