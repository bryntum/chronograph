import { CalculatedValueGen, CalculatedValueSync, Identifier, Variable } from "../chrono/Identifier.js";
import { Mixin } from "../class/BetterMixin.js";
import { ReadMode } from "./Replica.js";
//---------------------------------------------------------------------------------------------------------------------
/**
 * Mixin, for the identifier that represent a field of the entity. Requires the [[Identifier]] (or its subclass)
 * as a base class. See more about mixins: [[Mixin]]
 */
export class FieldIdentifier extends Mixin([Identifier], (base) => class FieldIdentifier extends base {
    constructor() {
        super(...arguments);
        /**
         * Reference to the [[Field]] this identifier represents
         */
        this.field = undefined;
        /**
         * Reference to the [[Entity]] this identifier represents
         */
        this.self = undefined;
        // temp storage for value for the phase, when identifier is created, but has not joined any graph
        // is cleared during the 1st join to the graph
        this.DATA = undefined;
    }
    // standaloneQuark     : InstanceType<this[ 'quarkClass' ]>
    // readFromGraphDirtySync (graph : Checkout) {
    //     if (graph)
    //         return graph.readDirty(this)
    //     else
    //         return this.DATA
    // }
    // returns the value itself if there were no affecting writes for it
    // otherwise - promise
    getFromGraph(graph) {
        if (graph) {
            if (graph.readMode === ReadMode.Current)
                return graph.get(this);
            if (graph.readMode === ReadMode.Previous)
                return graph.baseRevision.get(this, graph);
            if (graph.readMode === ReadMode.ProposedOrPrevious)
                graph.activeTransaction.readProposedOrPrevious(this);
            return graph.activeTransaction.readCurrentOrProposedOrPrevious(this);
        }
        else
            return this.DATA;
    }
    readFromGraph(graph) {
        if (graph)
            return graph.read(this);
        else
            return this.DATA;
    }
    writeToGraph(graph, proposedValue, ...args) {
        if (graph)
            graph.write(this, proposedValue, ...args);
        else
            this.DATA = proposedValue;
    }
    toString() {
        return this.name;
    }
}) {
}
export class MinimalFieldIdentifierSync extends FieldIdentifier.mix(CalculatedValueSync) {
}
export class MinimalFieldIdentifierGen extends FieldIdentifier.mix(CalculatedValueGen) {
}
export class MinimalFieldVariable extends FieldIdentifier.mix(Variable) {
}
//---------------------------------------------------------------------------------------------------------------------
/**
 * Mixin, for the identifier that represent an entity as a whole. Requires the [[Identifier]] (or its subclass)
 * as a base class. See more about mixins: [[Mixin]]
 */
export class EntityIdentifier extends Mixin([Identifier], (base) => class EntityIdentifier extends base {
    constructor() {
        super(...arguments);
        /**
         * [[EntityMeta]] instance of the entity this identifier represents
         */
        this.entity = undefined;
        /**
         * Reference to the [[Entity]] this identifier represents
         */
        this.self = undefined;
    }
    // entity atom is considered changed if any of its incoming atoms has changed
    // this just means if it's calculation method has been called, it should always
    // assign a new value
    equality() {
        return false;
    }
    toString() {
        return `Entity identifier [${this.self}]`;
    }
}) {
}
export class MinimalEntityIdentifier extends EntityIdentifier.mix(CalculatedValueGen) {
}
