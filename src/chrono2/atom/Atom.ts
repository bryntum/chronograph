import { AnyConstructor } from "../../class/Mixin.js"
import { Uniqable } from "../../util/Uniqable.js"
import { Owner } from "../data/Immutable.js"
import { ChronoGraph } from "../graph/Graph.js"
import { chronoReference, ChronoReference, Identifiable } from "./Identifiable.js"
import { AtomState, Quark } from "./Quark.js"


//---------------------------------------------------------------------------------------------------------------------
export class Atom extends Owner implements Identifiable, Uniqable {
    id                  : ChronoReference      = chronoReference()
    name                : string        = undefined

    // same value for all branches
    identity            : this          = this

    uniqable            : number        = Number.MIN_SAFE_INTEGER
    uniqable2           : number        = Number.MIN_SAFE_INTEGER

    uniqableBox         : any           = undefined
    uniqableBox2        : any           = undefined

    immutable           : Quark         = this.buildDefaultImmutable()

    state               : AtomState     = AtomState.Empty

    graph               : ChronoGraph   = undefined


    level               : number        = 0
    lazy                : boolean       = true


    buildDefaultImmutable () : Quark {
        return undefined
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
        clone.name      = this.name

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
        const newValue      = quark.readRaw()
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

            quark.forEachOutgoing((outgoing, atom) => {
                 if (atom.state === AtomState.UpToDate) toVisit.push(atom.immutable)
            })
        }

    }


    propagateStale () {
        this.immutable.forEachOutgoing((quark, atom) => {
            atom.state = AtomState.Stale
        })

        if (!this.immutable.frozen) this.immutable.clearOutgoing()
    }
}
