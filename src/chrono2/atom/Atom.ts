import { AnyConstructor } from "../../class/Mixin.js"
import { Uniqable } from "../../util/Uniqable.js"
import { Owner } from "../data/Immutable.js"
import { ChronoGraph } from "../graph/Graph.js"
import { Iteration } from "../graph/Iteration.js"
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
    $state              : AtomState     = AtomState.Empty

    // state               : AtomState     = AtomState.Empty
    stateIteration      : Iteration     = undefined
    stateQuark          : Quark         = undefined

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


    get state () {
        if (this.graph) {
            if (
                this.stateIteration && !this.stateIteration.isRejected
                && (this.stateQuark === this.immutable || this.immutable.previous === this.stateQuark)
            ) {
                return this.$state
            }

            this.stateIteration     = this.immutable.iteration
            this.stateQuark         = this.immutable

            return this.$state      = this.immutable.readRaw() !== undefined ? AtomState.UpToDate : AtomState.Empty
        } else {
            return this.$state
        }
    }


    set state (state : AtomState) {
        this.$state             = state

        if (this.graph) {
            this.stateIteration     = this.graph.currentIteration
            this.stateQuark         = this.immutable
        }
    }


    // should only be used in undo/redo context
    resetQuark (quark : Quark) {
        const newValue      = quark.readRaw()
        const oldValue      = this.immutable.readRaw()

        if (this.equality(newValue, oldValue)) {
            this.immutable  = quark
            this.state      = newValue !== undefined ? AtomState.UpToDate : AtomState.Stale

            return
        }

        this.propagateDeepStaleOutsideOfGraph()

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

                if (atom.graph && !atom.lazy) {
                    atom.graph.addPossiblyStaleStrictAtomToTransaction(atom)
                }
            }

            quark.forEachOutgoing((outgoing, atom) => {
                if (atom.state === AtomState.UpToDate) toVisit.push(atom.immutable)
            })
        }
    }


    propagateDeepStaleOutsideOfGraph () {
        const toVisit : Quark[]         = []

        if (this.state === AtomState.UpToDate) {
            this.state      = AtomState.PossiblyStale

            if (this.graph && !this.lazy) {
                this.graph.addPossiblyStaleStrictAtomToTransaction(this)
            }
        }

        const graph         = this.graph

        this.immutable.forEachOutgoing((outgoing, atom) => {
            if (atom.graph !== graph) {
                // only go deeper if state was UpToDate
                if (atom.state === AtomState.UpToDate) toVisit.push(atom.immutable)

                // but reset to stale anyway
                atom.state  = AtomState.Stale
            }
        })

        // seems we should not clear outgoing in `propagateDeepStaleOutsideOfGraph`
        // but it only used in undo/redo, which means the quark will be frozen anyway,
        // so this condition is always false
        // if (!this.immutable.frozen) this.immutable.clearOutgoing()

        while (toVisit.length) {
            const quark     = toVisit.pop()

            const atom      = quark.owner

            if (atom.state === AtomState.UpToDate) {
                atom.state      = AtomState.PossiblyStale

                if (atom.graph && !atom.lazy) {
                    atom.graph.addPossiblyStaleStrictAtomToTransaction(atom)
                }
            }

            quark.forEachOutgoing((outgoing, atom) => {
                if (atom.graph !== graph) {
                    if (atom.state === AtomState.UpToDate) toVisit.push(atom.immutable)
                }
            })
        }
    }


    // immediate outgoings should become stale, further outgoings - possibly stale
    propagateStaleDeep () {
        const toVisit : Quark[]         = []

        if (this.state === AtomState.UpToDate) {
            this.state      = AtomState.PossiblyStale

            if (this.graph && !this.lazy) {
                this.graph.addPossiblyStaleStrictAtomToTransaction(this)
            }
        }

        this.immutable.forEachOutgoing((outgoing, atom) => {
            // only go deeper if state was UpToDate
            if (atom.state === AtomState.UpToDate) {
                toVisit.push(atom.immutable)

                if (atom.graph && !atom.lazy) {
                    atom.graph.addPossiblyStaleStrictAtomToTransaction(atom)
                }
            }

            // but reset to stale anyway
            atom.state  = AtomState.Stale
        })

        if (!this.immutable.frozen) this.immutable.clearOutgoing()

        while (toVisit.length) {
            const quark     = toVisit.pop()

            const atom      = quark.owner

            if (atom.state === AtomState.UpToDate) {
                atom.state      = AtomState.PossiblyStale

                if (atom.graph && !atom.lazy) {
                    atom.graph.addPossiblyStaleStrictAtomToTransaction(atom)
                }
            }

            quark.forEachOutgoing((outgoing, atom) => {
                if (atom.state === AtomState.UpToDate) toVisit.push(atom.immutable)
            })
        }
    }


    propagateStaleShallow () {
        this.immutable.forEachOutgoing((quark, atom) => {
            if (atom.graph && !atom.lazy && atom.state === AtomState.UpToDate) {
                atom.graph.addPossiblyStaleStrictAtomToTransaction(atom)
            }

            atom.state = AtomState.Stale
        })

        if (!this.immutable.frozen) this.immutable.clearOutgoing()
    }
}
