import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { uniqueOnly } from "../collection/Iterator.js"
import { Identifier } from "../primitives/Identifier.js"
import { Quark } from "./Quark.js"


//---------------------------------------------------------------------------------------------------------------------
export const Revision = <T extends AnyConstructor<Base>>(base : T) =>

class Revision extends base {
    previous                : Revision

    scope                   : Map<Identifier, Quark>    = new Map()


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
            const quark = previous.scope.get(identifier)

            if (quark) return quark

            previous    = previous.previous
        }

        return null
    }


    getLatestQuarkFor (identifier : Identifier) : Quark {
        const current       = this.scope.get(identifier)

        if (current) return current

        return this.getPreviousQuarkFor(identifier)
    }


    * thisAndAllPrevious () {
        yield this

        yield* this.allPrevious()
    }


    * allPrevious () {
        let previous    = this.previous

        while (previous) {
            yield previous

            previous    = previous.previous
        }
    }


    * allIdentifiersDeep () {
        yield* uniqueOnly(function * () {
            for (const revision of this.thisAndAllPrevious()) {
                yield* revision.scope.keys()
            }
        }())
    }

}

export type Revision = Mixin<typeof Revision>

export interface RevisionI extends Revision {}

export class MinimalRevision extends Revision(Base) {
}
