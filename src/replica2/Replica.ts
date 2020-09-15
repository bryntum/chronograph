import { ChronoGraph } from "../chrono2/graph/Graph.js"
import { ClassUnion, Mixin } from "../class/Mixin.js"
import { Schema } from "../schema2/Schema.js"
import { FieldAtom } from "./Atom.js"
import { Entity } from "./Entity.js"

export enum ReadMode {
    Consistent,
    ConsistentOrProposedOrPrevious
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
    schema                  : Schema            = undefined

    /**
     * Replica re-defines the default value of the `autoCommit` property to `true`.
     */
    autoCommit              : boolean           = true

    readMode                : ReadMode          = ReadMode.Consistent

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


    readFieldWithAccessor (fieldAtom : FieldAtom) {
        const readMode  = fieldAtom.graph.readMode

        if (readMode === ReadMode.Consistent) return fieldAtom.sync ? fieldAtom.read() : fieldAtom.readAsync()
        if (readMode === ReadMode.ConsistentOrProposedOrPrevious) return fieldAtom.readConsistentOrProposedOrPrevious()
    }
}){}
