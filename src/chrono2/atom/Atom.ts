import { AnyConstructor } from "../../class/Mixin.js"
import { Uniqable } from "../../util/Uniqable.js"
import { CalculationModeSync } from "../CalculationMode.js"
import { Owner } from "../data/Immutable.js"
import { EffectHandler } from "../Effect.js"
import { globalContext } from "../GlobalContext.js"
import { ChronoGraph } from "../graph/Graph.js"
import { Iteration } from "../graph/Iteration.js"
import { chronoReference, ChronoReference, Identifiable } from "./Identifiable.js"
import { DefaultMetaSync, Meta } from "./Meta.js"
import { Quark } from "./Quark.js"


//---------------------------------------------------------------------------------------------------------------------
// Benchmarking has shown that there's no difference when using numbers
// v8 optimizes comparison of immutable strings to pointer comparison I guess
export enum AtomState {
    Empty           = 'Empty',
    UpToDate        = 'UpToDate',
    PossiblyStale   = 'PossiblyStale',
    Stale           = 'Stale',
    CheckingDeps    = 'CheckingDeps',
    Calculating     = 'Calculating'
}


//---------------------------------------------------------------------------------------------------------------------
export class Atom<V = unknown> extends Owner implements Identifiable, Uniqable {
    id                  : ChronoReference      = chronoReference()
    // same value for all branches
    identity            : this          = this

    uniqable            : number        = Number.MIN_SAFE_INTEGER
    uniqable2           : number        = Number.MIN_SAFE_INTEGER

    uniqableBox         : any           = undefined
    uniqableBox2        : any           = undefined

    immutable           : Quark         = this.buildDefaultImmutable()

    // this is a cache for a state of the new, "virtual" quark
    // such quark appears when we write new state to the frozen quark, like "possibly stale"
    // but, we don't want to create a new empty quark for "possibly stale" state -
    // because "possibly stale" might resolve to "up to date" and that would be a waste
    // of instantiation
    // instead we write a new state to this property and save some other additional information
    // (see properties below)
    // then reads/writes to `state` property tracks from where to get the state - either from cache
    // or from quark
    $state              : AtomState     = undefined
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


    immutableForWrite () : this[ 'immutable' ] {
        if (this.immutable.frozen) this.setCurrent(this.immutable.createNext())

        return this.immutable
    }


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

        // TODO the `$state` cache management for branches
        // might need additional tweaks or at least tests
        clone.$state            = this.$state
        clone.stateQuark        = this.stateQuark
        clone.stateIteration    = this.stateIteration

        return clone
    }


    freeze () {
        this.immutable.freeze()
    }


    // dummy type-checking purposes only properties, real ones, with initializers
    // are defined in `CalculableBox` and `CalculableBoxGen`
    iterationNumber     : number
    iterationResult     : IteratorResult<any>


    isCalculationStarted () : boolean {
        throw new Error("Abstract method")
    }


    isCalculationCompleted () : boolean {
        throw new Error("Abstract method")
    }


    startCalculation (onEffect : EffectHandler<CalculationModeSync>) : IteratorResult<any> {
        throw new Error("Abstract method")
    }


    continueCalculation (value : unknown) : IteratorResult<any> {
        throw new Error("Abstract method")
    }


    shouldCheckDependencies () : boolean {
        throw new Error("Abstract method")
    }


    actualize () {
        throw new Error("Abstract method")
    }


    updateValue (value : V) {
        throw new Error("Abstract method")
    }


    read () : V {
        throw new Error("Abstract method")
    }


    async readAsync () : Promise<V> {
        return this.read()
    }


    materializeCachedStateIntoQuark () {
        const nextQuark     = this.stateQuark.createNext()

        nextQuark.state     = this.$state

        nextQuark.freeze()

        this.stateIteration.forceAddQuark(nextQuark)
    }


    // TODO
    // it seems the trick with temporary storing of state on atom is actually making
    // the `shallow_changes` benchmark slower?? (the whole point of the trick was
    // to speed up that particular use case)
    // remove it then? removing makes some other benchmarks better
    get state () : AtomState {
        if (this.$state === undefined) {
            return this.immutable.state
        } else {
            if (this.isNextOf(this.immutable)) {
                return this.$state
            }

            // TODO do we need this line?
            if (this.stateIteration.frozen) this.materializeCachedStateIntoQuark()

            this.$state             = undefined
            this.stateIteration     = undefined
            this.stateQuark         = undefined

            return this.immutable.state
        }
    }


    set state (state : AtomState) {
        const immutable             = this.immutable

        // TODO should be: immutable.frozen && "not a zero quark"
        // OR, remove the concept of zero quark, then: `immutable && immutable.frozen`
        if (immutable.frozen && immutable.previous) {
            if (this.$state !== undefined) {
                if (this.isNextOf(immutable)) {
                    this.$state             = state

                    return
                } else {
                    this.materializeCachedStateIntoQuark()
                }
            }

            this.$state             = state

            const transaction       = this.graph.$immutable || this.graph.immutable

            this.stateIteration     = transaction.$immutable || transaction.immutable
            this.stateQuark         = immutable
        } else {
            immutable.state         = state

            if (this.$state) {
                // probably should be here
                // if (this.stateIteration.frozen) this.materializeCachedStateIntoQuark()

                this.$state             = undefined
                this.stateIteration     = undefined
                this.stateQuark         = undefined
            }
        }
    }


    isNextOf (quark : Quark) : boolean {
        return !this.stateIteration.isRejected
            && (this.stateQuark === this.immutable || this.stateQuark === this.immutable.previous)
    }


    checkoutSelf () : this {
        const activeAtom    = globalContext.activeAtom
        const activeGraph   = activeAtom ? activeAtom.graph : undefined

        if (this.graph && activeGraph && activeGraph !== this.graph && activeGraph.identity === this.graph.identity)
            return activeGraph.checkout(this)
        else
            return this
    }


    // should only be used in undo/redo context
    resetQuark (quark : Quark) {
        const newValue      = quark.readRaw()
        const oldValue      = this.immutable.readRaw()

        if (!this.equality(newValue, oldValue)) this.propagateDeepStaleOutsideOfGraph()

        this.immutable      = quark
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

                quark.forEachOutgoing((outgoing, atom) => {
                    if (atom.state === AtomState.UpToDate) toVisit.push(atom.immutable)
                })
            }
        }
    }


    propagateDeepStaleOutsideOfGraph () {
        const toVisit1 : Quark[]    = []

        const graph                 = this.graph

        this.immutable.forEachOutgoing((outgoing, atom) => {
            if (atom.graph !== graph) {
                // only go deeper if state was UpToDate
                if (atom.state === AtomState.UpToDate) toVisit1.push(atom.immutable)

                // but reset to stale anyway
                atom.state  = AtomState.Stale
            }
        })

        // seems we should not clear outgoing in `propagateDeepStaleOutsideOfGraph`
        // it is only used in undo/redo, which means the quark will be always frozen,
        // so this condition is always false
        // if (!this.immutable.frozen) this.immutable.clearOutgoing()

        const toVisit2 : Quark[]         = []

        for (let i = 0; i < toVisit1.length; i++) {
            const quark     = toVisit1[ i ]

            quark.forEachOutgoing((outgoing, atom) => {
                if (atom.state === AtomState.UpToDate) toVisit2.push(atom.immutable)
            })
        }

        while (toVisit2.length) {
            const quark     = toVisit2.pop()

            const atom      = quark.owner

            if (atom.state === AtomState.UpToDate) {
                atom.state      = AtomState.PossiblyStale

                if (atom.graph && !atom.lazy) {
                    atom.graph.addPossiblyStaleStrictAtomToTransaction(atom)
                }

                quark.forEachOutgoing((outgoing, atom) => {
                    if (atom.graph !== graph) {
                        if (atom.state === AtomState.UpToDate) toVisit2.push(atom.immutable)
                    }
                })
            }
        }
    }


    // immediate outgoings should become stale, further outgoings - possibly stale
    propagateStaleDeep () {
        const toVisit1 : Quark[]         = []

        this.immutable.forEachOutgoing((outgoing, atom) => {
            // only go deeper if state was UpToDate
            if (atom.state === AtomState.UpToDate) {
                toVisit1.push(atom.immutable)

                if (atom.graph && !atom.lazy) {
                    atom.graph.addPossiblyStaleStrictAtomToTransaction(atom)
                }
            }

            // but reset to stale anyway
            atom.state  = AtomState.Stale
        })

        if (!this.immutable.frozen) this.immutable.clearOutgoing()

        const toVisit2 : Quark[]         = []

        for (let i = 0; i < toVisit1.length; i++) {
            const quark     = toVisit1[ i ]

            quark.forEachOutgoing((outgoing, atom) => {
                if (atom.state === AtomState.UpToDate) toVisit2.push(atom.immutable)
            })
        }

        while (toVisit2.length) {
            const quark     = toVisit2.pop()

            const atom      = quark.owner

            if (atom.state === AtomState.UpToDate) {
                atom.state      = AtomState.PossiblyStale

                if (atom.graph && !atom.lazy) {
                    atom.graph.addPossiblyStaleStrictAtomToTransaction(atom)
                }

                quark.forEachOutgoing((outgoing, atom) => {
                    if (atom.state === AtomState.UpToDate) toVisit2.push(atom.immutable)
                })
            }
        }
    }


    propagateStaleShallow () {
        this.immutable.forEachOutgoing((quark, atom) => {
            if (atom.graph && !atom.lazy && atom.state === AtomState.UpToDate) {
                atom.graph.addPossiblyStaleStrictAtomToTransaction(atom)
            }

            atom.state = AtomState.Stale
        })

        if (!this.immutable.frozen && !globalContext.activeAtom) this.immutable.clearOutgoing()
    }
}
