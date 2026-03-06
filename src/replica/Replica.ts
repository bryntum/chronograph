import { ChronoGraph } from "../chrono/Graph.js"
import { Identifier } from "../chrono/Identifier.js"
import { ClassUnion, Mixin } from "../class/Mixin.js"
import { Schema } from "../schema/Schema.js"
import { Entity } from "./Entity.js"

/**
 * Controls how field values are read from the replica. Determines which value is returned
 * when accessing an entity's field.
 */
export enum ReadMode {
    /** Read the current computed value (default) */
    Current,
    /** Read the value from the previous revision */
    Previous,
    /** Read the proposed (user-written) value, falling back to the previous value */
    ProposedOrPrevious,
    /** Read the current computed value, falling back to proposed-or-previous if not yet computed */
    CurrentOrProposedOrPrevious
}


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
export class Replica extends Mixin(
    [ ChronoGraph ],
    (base : ClassUnion<typeof ChronoGraph>) =>

class Replica extends base {
    /** The schema defining the entity structure (entities and their fields) for this replica */
    schema                  : Schema

    /**
     * Replica re-defines the default value of the `autoCommit` property to `true`.
     */
    autoCommit              : boolean           = true

    /** Controls how field values are read. See [[ReadMode]] for available modes */
    readMode                : ReadMode          = ReadMode.Current

    /**
     * Add entity instance to the replica
     *
     * @param entity
     */
    addEntity (entity : Entity) {
        entity.enterGraph(this)
    }


    /**
     * Add several entity instances to the replica
     *
     * @param entity
     */
    addEntities (entities : Entity[]) {
        entities.forEach(entity => this.addEntity(entity))
    }


    /**
     * Remove entity instance from the replica
     *
     * @param entity
     */
    removeEntity (entity : Entity) {
        entity.leaveGraph(this)
    }


    /**
     * Remove several entity instances from the replica
     *
     * @param entity
     */
    removeEntities (entities : Entity[]) {
        entities.forEach(entity => this.removeEntity(entity))
    }
}){}
