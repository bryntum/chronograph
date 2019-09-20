import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { Identifier } from "./Identifier.js"
import { Quark, TombstoneQuark } from "./Quark.js"
import { QuarkEntry } from "./QuarkEntry.js"
import { MinimalTransaction } from "./Transaction.js"


export type Scope = Map<Identifier, QuarkEntry>


//---------------------------------------------------------------------------------------------------------------------
let COUNTER : number = 0

export const Revision = <T extends AnyConstructor<Base>>(base : T) =>

class Revision extends base {
    name                    : string    = 'revision-' + (COUNTER++)

    previous                : Revision

    scope                   : Scope     = new Map()

    reachableCount          : number    = 0
    referenceCount          : number    = 0

    selfDependentQuarks     : Set<Quark>    = new Set()


    getLatestEntryFor (identifier : Identifier) : QuarkEntry {
        let revision : Revision = this

        while (revision) {
            const entry = revision.scope.get(identifier)

            if (entry) return entry

            revision    = revision.previous
        }

        return null
    }


    hasIdentifier (identifier : Identifier) : boolean {
        const latestEntry   = this.getLatestEntryFor(identifier)

        return Boolean(latestEntry && (!latestEntry.quark || !(latestEntry.quark instanceof TombstoneQuark)))
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
            return latestEntry.value
        } else {
            return this.calculateLazyEntry(latestEntry)
        }
    }


    calculateLazyEntry (entry : QuarkEntry) : any {
        const transaction   = MinimalTransaction.new({ baseRevision : this, candidate : this })

        transaction.entries.set(entry.identifier, entry)
        transaction.stackGen.push(entry)

        entry.forceCalculation()

        transaction.propagate()

        return entry.quark.value
    }

}

export type Revision = Mixin<typeof Revision>

export interface RevisionI extends Revision {}


export class MinimalRevision extends Revision(Base) {}
