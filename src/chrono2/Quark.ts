import { AnyConstructor, AnyFunction } from "../class/Mixin.js"
import { MIN_SMI } from "../util/Helpers.js"
import { compact, getUniqable, Uniqable } from "../util/Uniqable.js"
import { Immutable, Owner } from "./data/Immutable.js"
import { chronoId, ChronoId, Identifiable } from "./Identifiable.js"
import { ChronoGraph, ChronoIteration, Revision } from "./Graph.js"
import { Node } from "./Node.js"


//---------------------------------------------------------------------------------------------------------------------
// Benchmarking has shown that there's no difference when using numbers
// v8 optimizes comparison of immutable strings to pointer comparison I guess
export enum AtomState {
    Empty           = 'Empty',
    UpToDate        = 'UpToDate',
    PossiblyStale   = 'PossiblyStale',
    Stale           = 'Stale'
}

export class Quark extends Node implements Immutable/*, Identifiable*/ {
    // id          : ChronoId      = chronoId()

    owner       : Atom          = undefined

    previous    : this          = undefined

    frozen      : boolean       = false

    // synthetic incoming edge, reading from the "proposed" value
    usedProposedOrPrevious : unknown = undefined

    iteration       : ChronoIteration   = undefined


    get level () {
        return this.owner.level
    }


    freeze () {
        this.frozen = true
    }


    createNext () : this {
        this.freeze()

        const self      = this.constructor as AnyConstructor<this, typeof Immutable>
        const next      = new self()

        next.previous   = this
        next.owner      = this.owner

        next.revision   = this.revision

        if (this.owner.graph) this.owner.graph.registerQuark(next)

        return next
    }


    $incoming           : Quark[]
    $outgoing           : Quark[]


    forEachOutgoing (func : (quark : Quark) => any) {
        let quark : this = this

        const uniqable  = getUniqable()
        const uniqable2 = getUniqable()

        const graph     = this.owner.graph

        do {
            const outgoing = quark.$outgoing
            const outgoingRev = quark.$outgoingRev

            if (outgoing) {

                for (let i = outgoing.length - 1; i >= 0; i--) {
                    const outgoingRevision  = outgoingRev[ i ]
                    const outgoingQuark     = outgoing[ i ] as Quark

                    const outgoingOwner     = outgoingQuark.owner
                    // const outgoingOwner     = outgoingQuark.owner.graph === graph ? outgoingQuark.owner : graph.checkout(outgoingQuark.owner)

                    const delta             = uniqable2 - outgoingOwner.uniqable

                    if (delta > 1) {
                        if (outgoingOwner.immutable.revision === outgoingRevision)
                            outgoingOwner.uniqable      = uniqable2
                        else
                            outgoingOwner.uniqable      = uniqable
                    }
                }

                for (let i = 0; i < outgoing.length; i++) {
                    const outgoingQuark     = outgoing[ i ] as Quark
                    const outgoingOwner     = outgoingQuark.owner
                    // const outgoingOwner     = outgoingQuark.owner.graph === graph ? outgoingQuark.owner : graph.checkout(outgoingQuark.owner)

                    if (outgoingOwner.uniqable === uniqable2) {
                        outgoingOwner.uniqable = uniqable

                        func(outgoingQuark)
                    }
                }
            }

            // TODO
            // @ts-ignore
            if (quark.value !== undefined) break

            quark       = quark.previous

        } while (quark)
    }


    compactOutgoing (startFrom : number) {
        if (startFrom < 0) startFrom = 0

        const uniqable   = getUniqable()
        const uniqable2  = getUniqable()

        const outgoing = this.$outgoing
        const outgoingRev = this.$outgoingRev

        if (outgoing) {

            for (let i = outgoing.length - 1; i >= startFrom; i--) {
                const outgoingRevision  = outgoingRev[ i ] as number
                const outgoingQuark     = outgoing[ i ] as Quark

                const outgoingOwner     = outgoingQuark.owner

                const delta             = uniqable2 - outgoingOwner.uniqable

                if (delta > 1) {
                    if (outgoingOwner.immutable.revision === outgoingRevision)
                        outgoingOwner.uniqable      = uniqable2
                    else
                        outgoingOwner.uniqable      = uniqable
                }
            }

            let uniquePos : number      = startFrom

            for (let i = uniquePos; i < outgoing.length; i++) {
                const outgoingQuark     = outgoing[ i ] as Quark
                const outgoingOwner     = outgoingQuark.owner

                if (outgoingOwner.uniqable === uniqable2) {
                    outgoingOwner.uniqable = uniqable

                    outgoing[ uniquePos ]       = outgoingOwner.immutable
                    outgoingRev[ uniquePos ]    = outgoingOwner.immutable.revision

                    uniquePos++
                }
            }

            if (outgoing.length !== uniquePos) {
                outgoing.length = uniquePos
                outgoingRev.length = uniquePos
            }
        }
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class Atom extends Owner implements Identifiable, Uniqable {
    id                  : ChronoId      = chronoId()
    name                : string        = undefined

    uniqable            : number        = Number.MIN_SAFE_INTEGER
    uniqable2           : number        = Number.MIN_SAFE_INTEGER
    // uniqable3           : number        = Number.MIN_SAFE_INTEGER

    uniqableBox         : any           = undefined

    immutable           : Quark         = undefined

    state               : AtomState     = AtomState.Empty

    graph               : ChronoGraph   = undefined


    level               : number        = 0
    lazy                : boolean       = false


    buildDefaultImmutable () : Quark {
        throw new Error("Abstract method called")
    }


    enterGraph (graph : ChronoGraph) {
        if (this.graph && this.graph !== graph) throw new Error("Can only belong to a single graph for now")

        this.graph                  = graph
    }


    clone () : this {
        const cls       = this.constructor as AnyConstructor<this, typeof Atom>

        const clone     = new cls()

        clone.id        = this.id

        return clone
    }


    leaveGraph (graph : ChronoGraph) {
        if (this.graph !== graph) throw new Error("Atom not in graph")

        this.graph      = undefined
    }


    freeze () {
        this.immutable.freeze()
    }


    // fromUpToDateToPossiblyStale () {
    //
    // }

    updateQuark (quark : Quark) {
        // TODO
        // @ts-ignore
        const newValue      = quark.readRaw()
        // TODO
        // @ts-ignore
        const oldValue      = this.immutable.readRaw()

        // TODO
        // @ts-ignore
        if (this.equality && this.equality(newValue, oldValue)) {
            this.immutable  = quark
            this.state      = newValue !== undefined ? AtomState.UpToDate : AtomState.Stale

            return
        }

        // TODO here it should only propagate outside of the graph - atoms in the graph
        // should be reset to the previous state, directly to the UpToDate state
        this.propagatePossiblyStale()
        this.propagateStale()

        this.immutable  = quark
        this.state      = newValue !== undefined ? AtomState.UpToDate : AtomState.Stale
    }


    propagatePossiblyStale () {
        // TODO: also benchmark the following on big graphs
        //         const toVisit : Quark[]         = new Array(1000)
        //
        //         toVisit[ 0 ] = this.immutable

        const toVisit : Quark[]         = [ this.immutable ]
        const graph : ChronoGraph       = this.graph

        while (toVisit.length) {
            const quark     = toVisit.pop()

            const atom      = quark.owner

            atom.state      = AtomState.PossiblyStale

            if (atom.graph && !atom.lazy) {
                atom.graph.addPossiblyStaleStrictAtomToTransaction(atom)
            }

            quark.forEachOutgoing(outgoing => {
                const owner = outgoing.owner

                if (owner.graph === graph) {
                     if (owner.state === AtomState.UpToDate) toVisit.push(outgoing)
                } else {
                    const newAtom   = graph.checkout(owner)

                    if (newAtom.state === AtomState.UpToDate) toVisit.push(outgoing)
                }
            })
        }

    }


    propagateStale () {
        const graph : ChronoGraph   = this.graph

        this.immutable.forEachOutgoing(quark => {
            const owner = quark.owner

            if (owner.graph === graph)
                owner.state = AtomState.Stale
            else {
                graph.checkout(owner).state = AtomState.Stale
            }
        })

        if (!this.immutable.frozen) this.immutable.clearOutgoing()
    }
}
