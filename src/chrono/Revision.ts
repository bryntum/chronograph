import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { Identifier } from "./Identifier.js"
import { Quark } from "./Quark.js"
import { QuarkTransition } from "./QuarkTransition.js"
import { MinimalTransaction } from "./Transaction.js"


//---------------------------------------------------------------------------------------------------------------------
export class QuarkEntry extends Set<QuarkEntry> {
    static new (cfg) : QuarkEntry {
        const instance = new this

        cfg && Object.assign(instance, cfg)

        return instance
    }


    identifier          : Identifier

    quark               : Quark
    // outgoing            : Set<QuarkEntry>
    transition          : QuarkTransition

    // these 2 are not used for QuarkEntry and are here only to simplify the typings for WalkContext
    // TODO fix WalkContext typings and remove
    visitedAt               : number
    visitedTopologically    : boolean


    getTransition () : QuarkTransition {
        if (this.transition) return this.transition

        return this.transition = this.identifier.transitionClass.new({
            identifier      : this.identifier,

            previous        : null,
            edgesFlow       : 0,
            visitedAt       : -1,
            visitedTopologically : false
        })
    }


    getQuark () : Quark {
        if (this.quark) return this.quark

        return this.quark = this.identifier.quarkClass.new({ identifier : this.identifier })
    }


    get outgoing () : Set<QuarkEntry> {
        return this
    }


    getOutgoing () : Set<QuarkEntry> {
        return this
    }


    get value () : any {
        return this.quark ? this.quark.value : undefined
    }


    hasValue () : boolean {
        return Boolean(this.quark && this.quark.hasValue())
    }



}

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

    selfDependentQuarks     : Quark[]   = []


    getLatestEntryFor (identifier : Identifier) : QuarkEntry {
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
            return latestEntry.value
        } else {
            return this.calculateLazyEntry(latestEntry)
        }
    }


    calculateLazyEntry (entry : QuarkEntry) : any {
        const transaction   = MinimalTransaction.new({ baseRevision : this, candidate : this })

        transaction.entries.set(entry.identifier, entry)
        transaction.stackGen   = [ entry ]

        entry.getTransition().forceCalculation()

        transaction.propagate()

        return entry.quark.value
    }

}

export type Revision = Mixin<typeof Revision>

export interface RevisionI extends Revision {}


export class MinimalRevision extends Revision(Base) {}
