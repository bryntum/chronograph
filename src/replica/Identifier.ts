import { ChronoGraph } from "../chrono/Graph.js"
import { CalculatedValueGen, CalculatedValueSync, Identifier, Variable } from "../chrono/Identifier.js"
import { AnyConstructor, Mixin } from "../class/Mixin.js"
import { EntityMeta } from "../schema/EntityMeta.js"
import { Field } from "../schema/Field.js"
import { Entity } from "./Entity.js"
import { ReadMode, Replica } from "./Replica.js"


export interface PartOfEntityIdentifier {
    self        : Entity
}


//---------------------------------------------------------------------------------------------------------------------
/**
 * Mixin, for the identifier that represent a field of the entity. Requires the [[Identifier]] (or its subclass)
 * as a base class. See more about mixins: [[Mixin]]
 */
export class FieldIdentifier extends Mixin(
    [ Identifier ],
    (base : AnyConstructor<Identifier, typeof Identifier>) =>

class FieldIdentifier extends base implements PartOfEntityIdentifier {
    /**
     * Reference to the [[Field]] this identifier represents
     */
    field       : Field             = undefined

    /**
     * Reference to the [[Entity]] this identifier represents
     */
    self        : Entity            = undefined

    // temp storage for value for the phase, when identifier is created, but has not joined any graph
    // is cleared during the 1st join to the graph
    DATA        : this[ 'ValueT' ]  = undefined

    // standaloneQuark     : InstanceType<this[ 'quarkClass' ]>


    // readFromGraphDirtySync (graph : Checkout) {
    //     if (graph)
    //         return graph.readDirty(this)
    //     else
    //         return this.DATA
    // }


    // returns the value itself if there were no affecting writes for it
    // otherwise - promise
    getFromGraph (graph : Replica) : this[ 'ValueT' ] | Promise<this[ 'ValueT' ]> {
        if (graph) {
            if (graph.readMode === ReadMode.Current) return graph.get(this)
            if (graph.readMode === ReadMode.Previous) return graph.activeTransaction.readPrevious(this)
            if (graph.readMode === ReadMode.ProposedOrPrevious) graph.activeTransaction.readProposedOrPrevious(this)

            return graph.activeTransaction.readCurrentOrProposedOrPrevious(this)
        } else
            return this.DATA
    }


    readFromGraph (graph : Replica) : this[ 'ValueT' ] {
        if (graph)
            return graph.read(this)
        else
            return this.DATA
    }


    writeToGraph (graph : Replica, proposedValue : this[ 'ValueT' ], ...args : this[ 'ArgsT' ]) {
        if (graph)
            graph.write(this, proposedValue, ...args)
        else
            this.DATA = proposedValue
    }


    leaveGraph (graph : ChronoGraph) {
        const entry = graph.activeTransaction.getLatestStableEntryFor(this)

        if (entry) this.DATA = entry.getValue()

        super.leaveGraph(graph)
    }


    toString () : string {
        return this.name
    }
}){}

export type FieldIdentifierConstructor  = typeof FieldIdentifier

export class MinimalFieldIdentifierSync extends FieldIdentifier.mix(CalculatedValueSync) {}
export class MinimalFieldIdentifierGen extends FieldIdentifier.mix(CalculatedValueGen) {}
export class MinimalFieldVariable extends FieldIdentifier.mix(Variable) {}


//---------------------------------------------------------------------------------------------------------------------
/**
 * Mixin, for the identifier that represent an entity as a whole. Requires the [[Identifier]] (or its subclass)
 * as a base class. See more about mixins: [[Mixin]]
 */
export class EntityIdentifier extends Mixin(
    [ Identifier ],
    (base : AnyConstructor<Identifier, typeof Identifier>) =>

class EntityIdentifier extends base implements PartOfEntityIdentifier {
    /**
     * [[EntityMeta]] instance of the entity this identifier represents
     */
    entity      : EntityMeta        = undefined

    /**
     * Reference to the [[Entity]] this identifier represents
     */
    self        : Entity            = undefined


    // entity atom is considered changed if any of its incoming atoms has changed
    // this just means if it's calculation method has been called, it should always
    // assign a new value
    equality () : boolean {
        return false
    }


    toString () : string {
        return `Entity identifier [${ this.self }]`
    }
}){}

export class MinimalEntityIdentifier extends EntityIdentifier.mix(CalculatedValueGen) {}
