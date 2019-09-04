import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { reverse, uniqueOnly } from "../collection/Iterator.js"
import { Identifier } from "./Identifier.js"
import { Quark } from "./Quark.js"
import { QuarkTransition } from "./QuarkTransition.js"


//---------------------------------------------------------------------------------------------------------------------
export class QuarkEntry extends Base {
    identifier          : Identifier

    quark               : Quark
    outgoing            : Set<QuarkEntry>
    transition          : QuarkTransition

    // these 2 are not used for QuarkEntry and are here only to simplify the typings for WalkContext
    // TODO remove
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


    getOutgoing () : Set<QuarkEntry> {
        if (this.outgoing) return this.outgoing

        return this.outgoing = new Set()
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
}

export type Revision = Mixin<typeof Revision>

export interface RevisionI extends Revision {}


export class MinimalRevision extends Revision(Base) {}
