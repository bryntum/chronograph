import { MinimalGraphBox } from "../chronograph/Graph.js";
import { Base } from "../class/Mixin.js";
//---------------------------------------------------------------------------------------------------------------------
export const Replica = (base) => class Replica extends base {
    initialize(...args) {
        super.initialize(...args);
        this.graph = MinimalGraphBox.new();
    }
    addEntity(entity) {
        entity.joinGraph(this.graph);
    }
    addEntities(entities) {
        entities.forEach(entity => this.addEntity(entity));
    }
    propagate() {
        this.graph.propagate();
    }
};
export const MinimalReplica = Replica(Base);
