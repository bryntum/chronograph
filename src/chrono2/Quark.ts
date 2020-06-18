import { AnyConstructor, AnyFunction } from "../class/Mixin.js"
import { MIN_SMI } from "../util/Helpers.js"
import { compact, getUniqable, Uniqable } from "../util/Uniqable.js"
import { Immutable, Owner } from "./data/Immutable.js"
import { chronoId, ChronoId, Identifiable } from "./Identifiable.js"
import { ChronoGraph, ChronoIteration, Revision } from "./Graph.js"
import { Node } from "./Node.js"


//---------------------------------------------------------------------------------------------------------------------
// Benchmarking showed that there's no difference when using numbers
// v8 optimizes comparison of immutable strings to pointer comparison I guess
export enum AtomState {
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
    $outgoing           : (Quark | number)[]


    forEachOutgoing (func : (quark : Quark) => any) {
        let quark : this = this

        const uniqable  = getUniqable()

        do {
            const outgoing = quark.$outgoing

            if (outgoing) {

                for (let i = 0; i < outgoing.length; i += 2) {
                    const outgoingQuark     = outgoing[ i ] as Quark
                    const outgoingOwner     = outgoingQuark.owner

                    if (outgoingOwner.uniqable !== uniqable) {
                        outgoingOwner.uniqable      = uniqable

                        const outgoingRevision  = outgoing[ i + 1 ] as number

                        if (
                            outgoingOwner.immutable.revision === outgoingRevision
                        ) {
                            func(outgoingQuark)
                        }
                    }
                }
            }

            // TODO
            // @ts-ignore
            if (quark.value !== undefined) break

            quark       = quark.previous

        } while (quark)
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class Atom extends Owner implements Identifiable, Uniqable {
    id                  : ChronoId      = chronoId()

    uniqable            : number        = Number.MIN_SAFE_INTEGER

    uniqableBox         : any           = undefined

    immutable           : Quark         = undefined

    state               : AtomState     = AtomState.Stale

    graph               : ChronoGraph   = undefined


    level               : number        = 0
    lazy                : boolean       = false


    // actualize () : any {
    //     const graph     = this.graph
    //
    //     if (this.immutable.iteration === graph.currentIteration) return
    //
    //     if (!graph.currentIteration.previous) {
    //         this.immutable  = undefined
    //     } else {
    //         let immutable   = this.immutable
    //
    //         while (immutable && immutable.iteration.revision > graph.currentIteration.revision) {
    //             immutable  = immutable.previous
    //         }
    //
    //         this.immutable  = immutable
    //     }
    //
    //     if (!this.immutable) this.immutable = this.buildDefaultImmutable()
    // }


    buildDefaultImmutable () : Quark {
        throw new Error("Abstract method called")
    }


    enterGraph (graph : ChronoGraph) {
        if (this.graph && this.graph !== graph) throw new Error("Can only belong to a single graph for now")

        this.graph                  = graph
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

        while (toVisit.length) {
            const quark     = toVisit.pop()

            const atom      = quark.owner

            atom.state      = AtomState.PossiblyStale

            if (atom.graph && !atom.lazy) {
                atom.graph.addPossiblyStaleStrictAtomToTransaction(atom)
            }

            quark.forEachOutgoing(outgoing => {
                if (outgoing.owner.state === AtomState.UpToDate) toVisit.push(outgoing)
            })
        }

    }


    propagateStale () {
        this.immutable.forEachOutgoing(quark => quark.owner.state = AtomState.Stale)

        if (!this.immutable.frozen) this.immutable.clearOutgoing()
    }
}
