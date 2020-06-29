import { AnyConstructor } from "../../class/Mixin.js"
import { getUniqable } from "../../util/Uniqable.js"
import { Immutable } from "../data/Immutable.js"
import { Iteration } from "../graph/Iteration.js"
import { Atom } from "./Atom.js"
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
                            identity.uniqableBox2   = outgoingOwner
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

                        func(outgoingQuark, identity.uniqableBox2)
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
