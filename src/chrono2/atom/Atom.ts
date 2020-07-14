import { AnyConstructor } from "../../class/Mixin.js"
import { Uniqable } from "../../util/Uniqable.js"
import { Owner } from "../data/Immutable.js"
import { ChronoGraph } from "../graph/Graph.js"
import { chronoReference, ChronoReference, Identifiable } from "./Identifiable.js"
import { DefaultMetaSync, Meta } from "./Meta.js"
import { AtomState, Quark } from "./Quark.js"


//---------------------------------------------------------------------------------------------------------------------
export class Atom extends Owner implements Identifiable, Uniqable {
    id                  : ChronoReference      = chronoReference()
    // same value for all branches
    identity            : this          = this

    uniqable            : number        = Number.MIN_SAFE_INTEGER
    uniqable2           : number        = Number.MIN_SAFE_INTEGER

    uniqableBox         : any           = undefined
    uniqableBox2        : any           = undefined

    immutable           : Quark         = this.buildDefaultImmutable()

    // move to quark? to capture the state more precisely?
    // seems we'll  need to have a "preliminary" state on Atom too
    // the use case is that "PossiblyStale" state should not be
    // creating a new quark - thus having it on atom makes sense
    state               : AtomState     = AtomState.Empty

    graph               : ChronoGraph   = undefined

    //region meta
    name                : string        = undefined

    level               : number        = 0
    lazy                : boolean       = true

    $meta               : Meta      = undefined

    get meta () : Meta {
        if (this.$meta !== undefined) return this.$meta

        const cls = this.constructor as AnyConstructor<this, typeof Atom>

        return this.$meta = cls.meta
    }

    set meta (meta : Meta) {
        this.$meta      = meta

        this.lazy       = meta.lazy
        this.level      = meta.level
    }

    static meta : Meta     = DefaultMetaSync


    $equality       : (v1 : unknown, v2 : unknown) => boolean   = undefined

    get equality () : (v1 : unknown, v2 : unknown) => boolean {
        if (this.$equality !== undefined) return this.$equality

        return this.meta.equality
    }
    set equality (value : (v1 : unknown, v2 : unknown) => boolean) {
        this.$equality = value
    }
    //endregion


    buildDefaultImmutable () : Quark {
        return undefined
    }


    enterGraph (graph : ChronoGraph) {
        if (this.graph && this.graph !== graph) throw new Error("Can only belong to a single graph for now")

        this.graph                  = graph
    }


    leaveGraph (graph : ChronoGraph) {
        if (this.graph !== graph) throw new Error("Atom not in graph")

        this.graph      = undefined
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


    freeze () {
        this.immutable.freeze()
    }


    updateQuark (quark : Quark) {
        const newValue      = quark.readRaw()
        const oldValue      = this.immutable.readRaw()

        if (this.equality(newValue, oldValue)) {
            this.immutable  = quark
            this.state      = newValue !== undefined ? AtomState.UpToDate : AtomState.Stale

            return
        }

        // TODO (!!!) here it should only propagate outside of the graph - atoms in the graph
        // should be reset to the previous state, directly to the UpToDate state
        this.propagateStaleDeep()
        // this.propagatePossiblyStale()
        // this.propagateStale()

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

            if (atom.state === AtomState.UpToDate) {
                atom.state      = AtomState.PossiblyStale
            }

            if (atom.graph && !atom.lazy) {
                atom.graph.addPossiblyStaleStrictAtomToTransaction(atom)
            }

            quark.forEachOutgoing((outgoing, atom) => {
                if (atom.state === AtomState.UpToDate) toVisit.push(atom.immutable)
            })
        }
    }


    // immediate outgoings should become stale, further outgoings - possibly stale
    propagateStaleDeep () {
        const toVisit : Quark[]         = []

        if (this.state === AtomState.UpToDate) {
            this.state      = AtomState.PossiblyStale
        }

        if (this.graph && !this.lazy) {
            this.graph.addPossiblyStaleStrictAtomToTransaction(this)
        }

        this.immutable.forEachOutgoing((outgoing, atom) => {
            // only go deeper if state was UpToDate
            if (atom.state === AtomState.UpToDate) toVisit.push(atom.immutable)

            // but reset to stale anyway
            atom.state  = AtomState.Stale
        })

        // TODO remove the condition should be just `this.immutable.clearOutgoing()` ??
        if (!this.immutable.frozen) this.immutable.clearOutgoing()

        while (toVisit.length) {
            const quark     = toVisit.pop()

            const atom      = quark.owner

            if (atom.state === AtomState.UpToDate) {
                atom.state      = AtomState.PossiblyStale
            }

            if (atom.graph && !atom.lazy) {
                atom.graph.addPossiblyStaleStrictAtomToTransaction(atom)
            }

            quark.forEachOutgoing((outgoing, atom) => {
                if (atom.state === AtomState.UpToDate) toVisit.push(atom.immutable)
            })
        }
    }


    propagateStaleShallow () {
        this.immutable.forEachOutgoing((quark, atom) => {
            atom.state = AtomState.Stale

            // if (atom.graph && !atom.lazy) {
            //     atom.graph.addPossiblyStaleStrictAtomToTransaction(atom)
            // }
        })

        // TODO remove the condition should be just `this.immutable.clearOutgoing()` ??
        if (!this.immutable.frozen) this.immutable.clearOutgoing()
    }
}
