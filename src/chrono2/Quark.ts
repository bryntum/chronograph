import { AnyConstructor } from "../class/Mixin.js"
import { compact } from "../util/Uniqable.js"
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

        return next
    }


    $incoming           : Quark[]
    $outgoing           : Quark[]
}


//---------------------------------------------------------------------------------------------------------------------
export class Atom extends Owner implements Identifiable {
    id                  : ChronoId      = chronoId()

    immutable           : Quark         = undefined

    state               : AtomState     = AtomState.Stale

    graph               : ChronoGraph   = undefined


    level               : number        = 0
    lazy                : boolean       = false


    actualize () : any {
        const graph     = this.graph

        if (graph) {
            if (!graph.currentIteration().previous) {
                this.immutable  = undefined
            } else {
                let immutable   = this.immutable

                while (immutable && immutable.iteration.revision > graph.currentIteration().revision) {
                    immutable  = immutable.previous
                }

                this.immutable  = immutable
            }
        }
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


    propagatePossiblyStale () {
        const toVisit : Quark[]         = [ this.immutable ]

        while (toVisit.length) {
            const quark     = toVisit.pop()
            const atom      = quark.owner

            if (atom.state === AtomState.UpToDate) {
                atom.state = AtomState.PossiblyStale

                if (atom.graph && !atom.lazy) {
                    atom.graph.addPossiblyStaleStrictAtomToTransaction(atom)
                }

                if (quark.$outgoing) {
                    // TODO inline the `compact` code here, to avoid double pass through the `outgoing` array
                    const outgoing = quark.getOutgoing()

                    for (let i = 0; i < outgoing.length; i++) {
                        if (outgoing[ i ].owner.state === AtomState.UpToDate) toVisit.push(outgoing[ i ])
                    }
                }
            }
        }

    }


    propagateStale () {
        if (this.immutable.$outgoing) {
            const outgoing = this.immutable.getOutgoing()

            for (let i = 0; i < outgoing.length; i++) {
                outgoing[ i ].owner.state = AtomState.Stale
            }

            this.immutable.clearOutgoing()
        }

        if (this.graph) this.graph.addChangedAtomToTransaction(this)
    }
}
