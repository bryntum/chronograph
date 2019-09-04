import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { Identifier } from "./Identifier.js"
import { Quark, Tombstone } from "./Quark.js"
import { MinimalTransaction } from "./Transaction.js"


//---------------------------------------------------------------------------------------------------------------------
export type Scope = Map<Identifier, Quark>


//---------------------------------------------------------------------------------------------------------------------
let COUNTER : number = 0

export const Revision = <T extends AnyConstructor<Base>>(base : T) =>

class Revision extends base {
    generation              : number    = COUNTER++

    name                    : string    = 'revision-' + this.generation

    previous                : Revision

    scope                   : Scope     = new Map()

    reachableCount          : number    = 0
    referenceCount          : number    = 0

    selfDependentQuarks     : Set<Quark>    = new Set()


    getLatestEntryFor (identifier : Identifier) : Quark {
        let revision : Revision = this

        while (revision) {
            const entry = revision.scope.get(identifier)

            if (entry) return entry

            revision    = revision.previous
        }

        return null
    }


    * previousAxis () : Generator<Revision> {
        let revision : Revision = this

        while (revision) {
            yield revision

            revision    = revision.previous
        }
    }


    read (identifier : Identifier) : any {
        const latestEntry   = this.getLatestEntryFor(identifier)

        if (!latestEntry) throw new Error("Unknown identifier")

        if (latestEntry.hasValue()) {
            if (latestEntry.value === Tombstone) throw new Error("Unknown identifier")

            return latestEntry.value
        } else {
            return this.calculateLazyEntry(latestEntry)
        }
    }


    calculateLazyEntry (entry : Quark) : any {
        const transaction   = MinimalTransaction.new({ baseRevision : this, candidate : this })

        transaction.entries.set(entry.identifier, entry)
        transaction.stackGen   = [ entry ]

        entry.getTransition().forceCalculation()

        transaction.propagate()

        return entry.value
    }

}

export type Revision = Mixin<typeof Revision>

export interface RevisionI extends Revision {}


export class MinimalRevision extends Revision(Base) {}
