import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { reverse, uniqueOnly } from "../collection/Iterator.js"
import { Identifier } from "../primitives/Identifier.js"
import { QuarkEntry, Scope } from "./Checkout.js"


//---------------------------------------------------------------------------------------------------------------------
export const Revision = <T extends AnyConstructor<Base>>(base : T) =>

class Revision extends base {
    previous                : Revision

    scope                   : Scope    = new Map()


    getPreviousQuarkFor (identifier : Identifier) : QuarkEntry {
        let previous    = this.previous

        while (previous) {
            const quark = previous.scope.get(identifier)

            if (quark) return quark

            previous    = previous.previous
        }

        return null
    }


    getLatestQuarkFor (identifier : Identifier) : QuarkEntry {
        const latest        = this.scope.get(identifier)

        if (latest) return latest

        return this.getPreviousQuarkFor(identifier)
    }


    * thisAndAllPrevious () : IterableIterator<Revision> {
        yield this

        yield* this.allPrevious()
    }


    * allPrevious () : IterableIterator<Revision> {
        let previous    = this.previous

        while (previous) {
            yield previous

            previous    = previous.previous
        }
    }


    // this includes Tombstones currently
    allIdentifiersDeep () : IterableIterator<Identifier> {
        const me        = this

        return uniqueOnly(function * () {
            for (const revision of me.thisAndAllPrevious()) {
                yield* revision.scope.keys()
            }
        }())
    }


    buildLatest () : Scope {
        const me        = this

        const entries   = function * () : IterableIterator<[ Identifier, QuarkEntry ]> {

            for (const revision of reverse(me.thisAndAllPrevious())) {
                yield* revision.scope
            }
        }

        return new Map(entries())
    }
}

export type Revision = Mixin<typeof Revision>

export interface RevisionI extends Revision {}


export class MinimalRevision extends Revision(Base) {}
