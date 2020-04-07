import { ChronoGraph } from "../chrono/Graph.js";
import { Mixin } from "../class/BetterMixin.js";
export var ReadMode;
(function (ReadMode) {
    ReadMode[ReadMode["Current"] = 0] = "Current";
    ReadMode[ReadMode["Previous"] = 1] = "Previous";
    ReadMode[ReadMode["ProposedOrPrevious"] = 2] = "ProposedOrPrevious";
    ReadMode[ReadMode["CurrentOrProposedOrPrevious"] = 3] = "CurrentOrProposedOrPrevious";
})(ReadMode || (ReadMode = {}));
//---------------------------------------------------------------------------------------------------------------------
/**
 * Reactive graph, operating on the set of entities (see [[Entity]] and [[EntityMeta]]), each having a set of fields (see [[Field]]).
 *
 * Entities are mapped to JS classes and fields - to their properties, decorated with [[field]].
 *
 * The calculation function for some field can be mapped to the class method, using the [[calculate]] decorator.
 *
 * An example of usage:
 *
 * ```ts
 * class Author extends Entity.mix(Base) {
 *     @field()
 *     firstName       : string
 *     @field()
 *     lastName        : string
 *     @field()
 *     fullName        : string
 *
 *     @calculate('fullName')
 *     calculateFullName () : string {
 *         return this.firstName + ' ' + this.lastName
 *     }
 * }
 * ```
 */
export class Replica extends Mixin([ChronoGraph], (base) => class Replica extends base {
    constructor() {
        super(...arguments);
        /**
         * Replica re-defines the default value of the `autoCommit` property to `true`.
         */
        this.autoCommit = true;
        this.readMode = ReadMode.Current;
    }
    /**
     * Add entity instance to the replica
     *
     * @param entity
     */
    addEntity(entity) {
        entity.enterGraph(this);
    }
    /**
     * Add several entity instances to the replica
     *
     * @param entity
     */
    addEntities(entities) {
        entities.forEach(entity => this.addEntity(entity));
    }
    /**
     * Remove entity instance from the replica
     *
     * @param entity
     */
    removeEntity(entity) {
        entity.leaveGraph(this);
    }
    /**
     * Remove several entity instances from the replica
     *
     * @param entity
     */
    removeEntities(entities) {
        entities.forEach(entity => this.removeEntity(entity));
    }
}) {
}
