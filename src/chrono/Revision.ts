import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { reverse, takeUntilIncluding, uniqueOnly } from "../collection/Iterator.js"
import { Identifier } from "../primitives/Identifier.js"
import { Quark } from "./Quark.js"


//---------------------------------------------------------------------------------------------------------------------
export const Revision = <T extends AnyConstructor<Base>>(base : T) =>

class Revision extends base {
    previous                : Revision

    scope                   : Map<Identifier, Quark>    = new Map()

    // optional cache, maintained from the outside
    latest                  : Map<Identifier, Quark>


    read (identifier : Identifier) : any {
        const latest    = this.getLatestQuarkFor(identifier)

        if (!latest) throw new Error("Unknown identifier")

        return latest.value
    }


    getPreviousQuarkFor (identifier : Identifier) : Quark {
        // we could use `allPrevious` here, but this method is going to be a hot path
        // so trying to stay "optimized"
        let previous    = this.previous

        while (previous) {
            if (previous.latest) return previous.latest.get(identifier)

            const quark = previous.scope.get(identifier)

            if (quark) return quark

            previous    = previous.previous
        }

        return null
    }


    getLatestQuarkFor (identifier : Identifier) : Quark {
        if (this.latest) return this.latest.get(identifier)

        const current       = this.scope.get(identifier)

        if (current) return current

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


    allIdentifiersDeep () : IterableIterator<Identifier> {
        if (this.latest) {
            return this.latest.keys()
        }

        const me        = this

        return uniqueOnly(function * () {
            for (const revision of me.thisAndAllPrevious()) {
                if (revision.latest) {
                    yield* revision.latest.keys()

                    return
                } else
                    yield* revision.scope.keys()
            }
        }())
    }


    buildLatest () : Map<Identifier, Quark> {
        const me        = this

        const entries = function * () : IterableIterator<[ Identifier, Quark ]> {

            for (const revision of reverse(takeUntilIncluding(me.thisAndAllPrevious(), revision => Boolean(revision.latest)))) {
                if (revision.latest) {
                    yield* revision.latest
                } else
                    yield* revision.scope
            }

        }

        return new Map(entries())
    }


    includeScopeToLatest (latest) : Map<Identifier, Quark> {
        for (const [ identifier, quark ] of this.scope) {
            latest.set(identifier, quark)
        }

        return latest
    }


    // excludeScopeFromLatest (latest) : Map<Identifier, Quark> {
    //     for (const [ identifier, quark ] of this.scope) {
    //         latest.set(identifier, quark)
    //     }
    //
    //     return latest
    // }


}

export type Revision = Mixin<typeof Revision>

export interface RevisionI extends Revision {}


export class MinimalRevision extends Revision(Base) {}
