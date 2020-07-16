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

export class Quark extends Node implements Immutable {
    owner       : Atom          = undefined

    previous    : this          = undefined

    frozen      : boolean       = false

    value       : unknown       = undefined

    usedProposedOrPrevious : boolean = false

    iteration       : Iteration = undefined


    hasValue () : boolean {
        return this.readRaw() !== undefined
    }


    hasOwnValue () : boolean {
        return this.value !== undefined
    }


    read () : any {
        let box : this = this

        while (box) {
            if (box.value !== undefined) return box.value

            box     = box.previous
        }

        return null
    }


    // TODO
    readRaw () : any {
        let box : this = this

        while (box) {
            if (box.value !== undefined) return box.value

            box     = box.previous
        }

        return undefined
    }


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


    // IMPORTANT LIMITATION : can not nest calls to `forEachOutgoing` (call `forEachOutgoing` in the `func` argument)
    // this messes up internal "uniqables" state
    forEachOutgoing (func : (quark : Quark, resolvedAtom : Atom) => any) {
        let quark : this = this

        const uniqable  = getUniqable()
        const uniqable2 = getUniqable()

        const graph     = this.owner.graph

        do {
            const outgoing      = quark.$outgoing
            const outgoingRev   = quark.$outgoingRev

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


    collectGarbage () {
        const uniqable              = getUniqable()
        const collapsedOutgoing     = []
        const collapsedOutgoingRev  = []

        let quark : this            = this

        let valueConsumed : boolean = false

        const zero                  = (this.constructor as AnyConstructor<this, typeof Quark>).getZero()

        do {
            // capture early, since we reset the `previous` on value consumption
            const previous  = quark.previous

            if (!valueConsumed) {
                const outgoing          = quark.$outgoing
                const outgoingRev       = quark.$outgoingRev

                if (outgoing) {

                    for (let i = outgoing.length - 1; i >= 0; i--) {
                        const outgoingRevision  = outgoingRev[ i ]
                        const outgoingQuark     = outgoing[ i ] as Quark

                        const identity          = outgoingQuark.owner.identity

                        if (identity.uniqable !== uniqable) {
                            identity.uniqable   = uniqable

                            if (outgoingRevision === (identity.uniqableBox as Quark).revision) {
                                collapsedOutgoing.push(outgoingQuark)
                                collapsedOutgoingRev.push(outgoingRevision)
                            }
                        }
                    }
                }

                if (quark.value !== undefined) {
                    valueConsumed       = true

                    if (quark !== this) this.copyFrom(quark)

                    this.previous       = zero

                    this.$outgoing      = collapsedOutgoing
                    this.$outgoingRev   = collapsedOutgoingRev
                }
            }

            if (quark !== this) quark.destroy()

            quark           = previous

        } while (quark)
    }


    destroy () {
        this.previous   = undefined
        this.value      = undefined

        this.clearOutgoing()
        this.$incoming  = undefined
    }


    copyFrom (quark : this) {
        this.value      = quark.value
        this.$incoming  = quark.$incoming
    }


    clone () {
        const cls                       = this.constructor as AnyConstructor<this, typeof Quark>

        const clone                     = new cls()

        clone.$outgoing                 = this.$outgoing ? this.$outgoing.slice() : undefined
        clone.$outgoingRev              = this.$outgoingRev ? this.$outgoingRev.slice() : undefined
        clone.$incoming                 = this.$incoming ? this.$incoming.slice() : undefined

        clone.owner                     = this.owner
        clone.previous                  = this.previous
        clone.frozen                    = this.frozen

        clone.usedProposedOrPrevious    = this.usedProposedOrPrevious
        clone.iteration                 = this.iteration

        clone.value                     = this.value

        return clone
    }


    static zero : Quark

    static getZero <T extends typeof Quark> (this : T) : InstanceType<T> {
        return this.zero as InstanceType<T>
    }
}

Quark.zero = new Quark()
Quark.zero.freeze()
