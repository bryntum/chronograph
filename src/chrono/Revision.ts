import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"
import { reverse, uniqueOnly } from "../collection/Iterator.js"
import { Identifier } from "./Identifier.js"
import { Quark } from "./Quark.js"
import { QuarkTransition } from "./QuarkTransition.js"

// //---------------------------------------------------------------------------------------------------------------------
// export const LazyQuarkMarker    = Symbol('LazyQuarkMarker')
// export type LazyQuarkMarker     = typeof LazyQuarkMarker
//
// export const PendingQuarkMarker = Symbol('PendingQuarkMarker')
// export type PendingQuarkMarker  = typeof PendingQuarkMarker

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
let ID : number = 0

export const Revision = <T extends AnyConstructor<Base>>(base : T) =>

class Revision extends base {
    name                    : string    = 'revision-' + (ID++)

    previous                : Revision

    scope                   : Scope     = new Map()

    reachableCount          : number    = 0
    referenceCount          : number    = 0

    selfDependentQuarks     : Quark[]   = []


    // forEachOutgoingInDimension (entry : QuarkEntry, func : (node : QuarkEntry) => any) {
    //     // const entry             = this.baseRevision.getLatestQuarkFor(node)
    //     //
    //     // // newly created identifier
    //     // if (!entry) return
    //     //
    //     // visitInfo.previous      = entry
    //     //
    //     // for (const outgoingEntry of entry.outgoing) {
    //     //     const identifier    = outgoingEntry.quark.identifier
    //     //
    //     //     let entry : QuarkEntry              = this.visited.get(identifier)
    //     //
    //     //     if (!entry) {
    //     //         const transition                = identifier.transitionClass.new({ identifier, previous : null, current : null, edgesFlow : 0, visitedAt : -1, visitedTopologically : false })
    //     //
    //     //         entry                           = QuarkEntry.new({ quark : null, outgoing : null, transition })
    //     //
    //     //         this.visited.set(identifier, entry)
    //     //     }
    //     //
    //     //     entry.transition.edgesFlow++
    //     //
    //     //     toVisit.push({ node : identifier, from : node, label : undefined })
    //     // }
    // }
    //
    //
    // addEdgeTo (fromNode : Quark, toNode : Quark) {
    //     // let entry               = this.scope.get(fromNode.identifier)
    //     //
    //     // if (!entry) {
    //     //     entry               = new QuarkEntry()
    //     //     this.scope.set(fromNode.identifier, entry)
    //     //
    //     //     entry.quark         = fromNode
    //     // }
    //     //
    //     // entry.add(toNode)
    // }


    getPreviousEntryFor (identifier : Identifier) : QuarkEntry {
        let previous    = this.previous

        while (previous) {
            const quark = previous.scope.get(identifier)

            if (quark) return quark

            previous    = previous.previous
        }

        return null
    }


    getLatestEntryFor (identifier : Identifier) : QuarkEntry {
        const latest        = this.scope.get(identifier)

        if (latest) return latest

        return this.getPreviousEntryFor(identifier)
    }


    * thisAndAllPrevious () : Iterable<Revision> {
        yield this

        yield* this.allPrevious()
    }


    * allPrevious () : Iterable<Revision> {
        let previous    = this.previous

        while (previous) {
            yield previous

            previous    = previous.previous
        }
    }


    // this includes Tombstones currently
    allIdentifiersDeep () : Iterable<Identifier> {
        const me        = this

        return uniqueOnly(function * () {
            for (const revision of me.thisAndAllPrevious()) {
                yield* revision.scope.keys()
            }
        }())
    }


    buildLatest () : Scope {
        const me        = this

        const entries   = function * () : Iterable<[ Identifier, QuarkEntry ]> {

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
