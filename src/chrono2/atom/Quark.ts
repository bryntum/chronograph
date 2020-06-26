import { AnyConstructor } from "../../class/Mixin.js"
import { getUniqable, Uniqable } from "../../util/Uniqable.js"
import { Immutable, Owner } from "../data/Immutable.js"
import { ChronoGraph } from "../graph/Graph.js"
import { Iteration } from "../graph/Iteration.js"
import { chronoId, ChronoId, Identifiable } from "../Identifiable.js"
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

    iteration       : Iteration   = undefined


    get level () {
        return this.owner.level
    }


    freeze () {
        this.frozen = true
    }


    createNext (owner? : Atom) : this {
        this.freeze()

        const self      = this.constructor as AnyConstructor<this, typeof Immutable>
        const next      = new self()

        next.previous   = this
        next.owner      = owner || this.owner

        next.revision   = this.revision

        return next
    }


    $incoming           : Quark[]
    $outgoing           : Quark[]


    forEachOutgoing (func : (quark : Quark, resolvedAtom : Atom) => any) {
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
                    const outgoingHistory   = outgoingQuark.owner

                    const identity          = outgoingHistory.identity

                    const delta             = uniqable2 - identity.uniqable

                    if (delta > 1) {
                        const outgoingOwner     = !outgoingHistory.graph || outgoingHistory.graph === graph ? outgoingHistory : graph.checkout(outgoingHistory)

                        if (outgoingOwner.immutable.revision === outgoingRevision) {
                            identity.uniqable       = uniqable2
                            identity.uniqableBox    = outgoingOwner
                        } else
                            identity.uniqable       = uniqable
                    }
                }

                for (let i = 0; i < outgoing.length; i++) {
                    const outgoingQuark     = outgoing[ i ] as Quark
                    const outgoingHistory   = outgoingQuark.owner

                    const identity          = outgoingHistory.identity

                    if (identity.uniqable === uniqable2) {
                        identity.uniqable = uniqable

                        func(outgoingQuark, identity.uniqableBox)
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

        const uniqable      = getUniqable()
        const uniqable2     = getUniqable()

        const outgoing      = this.$outgoing
        const outgoingRev   = this.$outgoingRev

        if (outgoing) {
            const graph     = this.owner.graph

            for (let i = outgoing.length - 1; i >= startFrom; i--) {
                const outgoingRevision  = outgoingRev[ i ]
                const outgoingQuark     = outgoing[ i ] as Quark
                const outgoingHistory   = outgoingQuark.owner

                const identity          = outgoingHistory.identity

                const delta             = uniqable2 - identity.uniqable

                if (delta > 1) {
                    const outgoingOwner     = !outgoingHistory.graph || outgoingHistory.graph === graph ? outgoingHistory : graph.checkout(outgoingHistory)

                    if (outgoingOwner.immutable.revision === outgoingRevision) {
                        identity.uniqable       = uniqable2
                        identity.uniqableBox    = outgoingOwner
                    } else
                        identity.uniqable       = uniqable
                }
            }

            let uniquePos : number      = startFrom

            for (let i = uniquePos; i < outgoing.length; i++) {
                const outgoingQuark     = outgoing[ i ] as Quark
                const outgoingHistory   = outgoingQuark.owner

                const identity          = outgoingHistory.identity

                if (identity.uniqable === uniqable2) {
                    identity.uniqable           = uniqable

                    outgoing[ uniquePos ]       = identity.uniqableBox.immutable
                    outgoingRev[ uniquePos ]    = identity.uniqableBox.immutable.revision

                    uniquePos++
                }
            }

            if (outgoing.length !== uniquePos) {
                outgoing.length         = uniquePos
                outgoingRev.length      = uniquePos
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

    // same value for all branches
    identity            : this          = this


    buildDefaultImmutable () : Quark {
        throw new Error("Abstract method called")
    }


    enterGraph (graph : ChronoGraph) {
        if (this.graph && this.graph !== graph) throw new Error("Can only belong to a single graph for now")

        this.graph                  = graph
    }


    setCurrent (immutable : this[ 'immutable' ]) {
        if (this.immutable && immutable && immutable.previous !== this.immutable) throw new Error("Invalid state thread")

        this.immutable = immutable

        if (this.graph) this.graph.registerQuark(immutable)
    }


    clone () : this {
        const cls       = this.constructor as AnyConstructor<this, typeof Atom>

        const clone     = new cls()

        clone.id        = this.id
        clone.identity  = this.identity

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

            quark.forEachOutgoing((outgoing, atom) => {
                 if (atom.state === AtomState.UpToDate) toVisit.push(atom.immutable)
            })
        }

    }


    propagateStale () {
        const graph : ChronoGraph   = this.graph

        this.immutable.forEachOutgoing((quark, atom) => {
            atom.state = AtomState.Stale
        })

        if (!this.immutable.frozen) this.immutable.clearOutgoing()
    }
}
