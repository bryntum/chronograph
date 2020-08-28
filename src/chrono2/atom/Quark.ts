import { AnyConstructor } from "../../class/Mixin.js"
import { copyArray, MIN_SMI } from "../../util/Helpers.js"
import { getUniqable } from "../../util/Uniqable.js"
import { Immutable } from "../data/Immutable.js"
import { Iteration } from "../graph/Iteration.js"
import { Atom, AtomState } from "./Atom.js"
import { Node } from "./Node.js"


export class Quark<V = unknown> extends Node implements Immutable {
    owner                   : Atom<V>           = undefined

    previous                : this              = undefined

    frozen                  : boolean           = false

    value                   : V                 = undefined

    usedProposedOrPrevious  : boolean           = false

    proposedValue           : V                 = undefined

    // if the newly calculated value is the same as previous - this property is
    // not updated, otherwise it is set to `revision`
    // this allows us to track the series of the same-value quarks, which does
    // not propagate staleness
    valueRevision           : number            = MIN_SMI

    iteration               : Iteration         = undefined

    state                   : AtomState         = AtomState.Empty


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


    createNext (owner? : Atom<V>) : this {
        this.freeze()

        const self          = this.constructor as AnyConstructor<this, typeof Immutable>
        const next          = new self()

        next.previous       = this
        next.owner          = owner || this.owner

        next.revision       = this.revision
        next.valueRevision  = this.valueRevision
        next.state          = this.state

        // TODO should possibly empty the cached atom's `$state` here

        return next
    }


    $incoming           : Quark[]
    $outgoing           : Quark[]


    getIncomingDeep () : this[ '$incoming' ] {
        let box : this = this

        while (box) {
            // as an edge case, atom may compute its value w/o external dependencies all of the sudden
            // in such case `$incoming` will be empty
            if (box.$incoming !== undefined || box.value !== undefined) return box.$incoming

            box     = box.previous
        }

        return undefined
    }



    // IMPORTANT LIMITATION : can not nest calls to `forEachOutgoing` (call `forEachOutgoing` in the `func` argument)
    // this messes up internal "uniqables" state
    forEachOutgoing (func : (quark : Quark, resolvedAtom : Atom) => any) {
        const uniqable      = getUniqable()
        const graph         = this.owner.graph

        let quark : this    = this

        do {
            const outgoing      = quark.$outgoing
            const outgoingRev   = quark.$outgoingRev

            if (outgoing) {

                for (let i = outgoing.length - 1; i >= 0; i--) {
                    const outgoingQuark     = outgoing[ i ]
                    const outgoingOwner     = outgoingQuark.owner
                    const identity          = outgoingOwner.identity

                    if (identity.uniqable !== uniqable) {
                        identity.uniqable   = uniqable

                        const outgoingAtom  = !graph || !outgoingOwner.graph || outgoingOwner.graph === graph ? outgoingOwner : graph.checkout(outgoingOwner)

                        if (outgoingAtom.immutable.revision === outgoingRev[ i ]) func(outgoingQuark, outgoingAtom)
                    }
                }
            }

            if (quark.value !== undefined && quark.revision === quark.valueRevision) break

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


    // magic dependency on `this.owner.identity.uniqableBox`
    collectGarbage () {
        const zero                  = (this.constructor as AnyConstructor<this, typeof Quark>).getZero()
        const uniqable              = getUniqable()

        const collapsedOutgoing     = []
        const collapsedOutgoingRev  = []


        let valueConsumed : boolean         = false
        let incomingsConsumed : boolean     = false
        let outgoingsConsumed : boolean     = false

        let quark : this            = this

        do {
            // capture early, since we reset the `previous` on value consumption
            const previous          = quark.previous

            if (!incomingsConsumed && quark.$incoming !== undefined) {
                incomingsConsumed   = true

                // TODO make a config option? see a comment for `this.$outgoing` below
                this.$incoming      = quark.$incoming
                // this.$incoming      = quark.$incoming.slice()
                // this.$incoming      = copyArray(quark.$incoming)
            }

            if (!outgoingsConsumed) {
                const outgoing          = quark.$outgoing
                const outgoingRev       = quark.$outgoingRev

                if (outgoing) {
                    for (let i = outgoing.length - 1; i >= 0; i--) {
                        const outgoingRevision  = outgoingRev[ i ]
                        const outgoingQuark     = outgoing[ i ] as Quark

                        const identity          = outgoingQuark.owner.identity

                        // should use `uniqable2` here (or may be even `uniqable3`) because `uniqable`
                        // at this point is already being used by `forEveryFirstQuarkTill` in the `graph.sweep()`
                        if (identity.uniqable2 !== uniqable) {
                            identity.uniqable2   = uniqable

                            // TODO requires extra attention
                            // remove this if the "shallow state" optimization for Atom will be removed
                            // `identity.uniqableBox === undefined` means that outgoing edge is actually going to the quark in the "shredding"
                            // iteration - thats why it is not set up in the `graph.sweep()`
                            // we do want to keep such edges, reproducible in `graph_garbage_collection.t.js`
                            if (!identity.uniqableBox || outgoingRevision === (identity.uniqableBox as Quark).revision) {
                                identity.uniqableBox    = undefined
                                collapsedOutgoing.push(outgoingQuark)
                                collapsedOutgoingRev.push(outgoingRevision)
                            }
                        }
                    }
                }

                if (quark.value !== undefined && quark.revision === quark.valueRevision) {
                    outgoingsConsumed   = true

                    // TODO make a config option?
                    // the trick with `[ ... ] / copyArray` creates a new array with the exact size for its elements
                    // it seems, normally, arrays allocates a little more memory, avoid allocation on every "push"
                    // the difference might be, like: for array of 20 elements, exact size is 80 bytes,
                    // extra size - 180 bytes! for many small arrays (exactly the chrono case) total difference might be
                    // significant: for 100k boxes with 4 backward deps each - from 69.7MB to 54.1MB
                    // there is a small performance penalty: from 435ms to 455ms (`benchmarks/chrono2/graphful/commit_gen`)
                    // it seems Array.from() is slower than manual `copyArray`... because of iterators protocol?
                    this.$outgoing      = collapsedOutgoing
                    this.$outgoingRev   = collapsedOutgoingRev
                    // this.$outgoing      = collapsedOutgoing.slice()
                    // this.$outgoingRev   = collapsedOutgoingRev.slice()
                    // this.$outgoing      = copyArray(collapsedOutgoing)
                    // this.$outgoingRev   = copyArray(collapsedOutgoingRev)
                }
            }

            // consume the top-most value, even if its the `sameValue`
            // reasoning is that even that `equality` check has passed
            // user may have some side effects that expects the value
            // to always be the result of latest `calculation` call
            if (!valueConsumed && quark.value !== undefined) {
                valueConsumed       = true

                if (quark !== this) this.copyValueFrom(quark)

                this.previous       = zero
                this.valueRevision  = this.revision
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


    copyValueFrom (quark : this) {
        this.value      = quark.value
    }


    clone () : this {
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
