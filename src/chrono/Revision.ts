import { Base } from "../class/Base.js"
import { Identifier } from "./Identifier.js"
import { Quark, TombStone } from "./Quark.js"


/**
 * A mapping from [[Identifier]] to [[Quark]], representing the set of identifier values in a single revision layer.
 */
export type Scope = Map<Identifier, Quark>


//---------------------------------------------------------------------------------------------------------------------
/** Monotonically increasing clock for ordering revisions */
export type RevisionClock   = number

let CLOCK : RevisionClock = 0

/**
 * An immutable snapshot of the graph state at a specific point in time.
 *
 * Each revision holds a [[scope]] — a map from identifiers to their quarks (computed values). Revisions form
 * a linked list via [[previous]], enabling undo/redo and efficient lookups: to find the latest value for an
 * identifier, the chain is walked from newest to oldest until a matching entry is found.
 *
 * Reference counting ([[referenceCount]] and [[reachableCount]]) is used for garbage collection of
 * revisions that are no longer needed.
 */
export class Revision extends Base {
    /** Monotonically increasing timestamp assigned at creation, used for ordering */
    createdAt               : RevisionClock = CLOCK++

    /** Human-readable name for debugging, defaults to `'revision-{createdAt}'` */
    name                    : string    = 'revision-' + this.createdAt

    /** Link to the previous revision, forming a linked list for value lookup and undo/redo */
    previous                : Revision  = undefined

    /** The identifier-to-quark mapping for this revision layer. Only contains entries that changed in this revision */
    scope                   : Scope     = new Map()

    /** Number of references from other revisions' `previous` pointers. Used for GC */
    reachableCount          : number    = 0
    /** Number of external references (from graph, transactions). Used for GC */
    referenceCount          : number    = 0

    /** Set of identifiers in this revision that depend on their own previous value */
    selfDependent           : Set<Identifier>   = new Set()


    /**
     * Walks the revision chain (this → previous → ...) and returns the first quark found for the given identifier,
     * or `null` if the identifier is not present in any revision in the chain.
     */
    getLatestEntryFor (identifier : Identifier) : Quark {
        let revision : Revision = this

        while (revision) {
            const entry = revision.scope.get(identifier)

            if (entry) return entry

            revision    = revision.previous
        }

        return null
    }


    /**
     * Returns `true` if the identifier exists in this revision chain and its value is not [[TombStone]] (i.e., not removed).
     */
    hasIdentifier (identifier : Identifier) : boolean {
        const latestEntry   = this.getLatestEntryFor(identifier)

        return Boolean(latestEntry && latestEntry.getValue() !== TombStone)
    }


    /** Generator that yields this revision and all previous revisions in the chain, from newest to oldest */
    * previousAxis () : Generator<Revision> {
        let revision : Revision = this

        while (revision) {
            yield revision

            revision    = revision.previous
        }
    }
}
