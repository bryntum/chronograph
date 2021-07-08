import { Serializable } from "typescript-serializable-mixin/index.js"
import { AnyConstructor } from "../../class/Mixin.js"
import { warn } from "../../environment/Debug.js"
import { Hook } from "../../event/Hook.js"
import { cycleInfo, OnCycleAction, VisitInfo, WalkContext, WalkDepthC, WalkStep } from "../../graph/WalkDepth.js"
import { MIN_SMI } from "../../util/Helpers.js"
import { getUniqable, Uniqable } from "../../util/Uniqable.js"
import { ComputationCycle, ComputationCycleError } from "../calculation/ComputationCycle.js"
import { CalculationModeSync } from "../CalculationMode.js"
import { Owner } from "../data/Immutable.js"
import { EffectHandler } from "../Effect.js"
import { ChronoGraph } from "../graph/Graph.js"
import { Iteration } from "../graph/Iteration.js"
import { chronoReference, ChronoReference, Identifiable } from "./Identifiable.js"
import { AtomCalculationPriorityLevel, DefaultMetaSync, Meta } from "./Meta.js"
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
export class Atom<V = unknown> extends Serializable.mix(Owner) implements Identifiable, Uniqable {
    V                   : V

    id                  : ChronoReference      = chronoReference()
    // same value for all branches
    identity            : this          = this

    uniqable            : number        = MIN_SMI
    uniqable2           : number        = MIN_SMI
    uniqable3           : number        = MIN_SMI

    uniqableBox         : any           = undefined
    uniqableBox2        : any           = undefined

    userInputRevision   : number        = MIN_SMI

    immutable           : Quark         = this.buildDefaultImmutable()

    // set to `false` to remove this atom from the graph, when it has no outgoing edges
    // (its value is not used in any other atoms)
    persistent          : boolean       = true

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

    context             : any           = undefined

    $commitValueOptimisticHook : Hook<[ this, V, V ]>       = undefined

    get commitValueOptimistic () : Hook<[ this, V, V ]> {
        if (this.$commitValueOptimisticHook !== undefined) return this.$commitValueOptimisticHook

        return this.$commitValueOptimisticHook = new Hook()
    }


    //region meta
    name                : string        = undefined

    level               : AtomCalculationPriorityLevel = AtomCalculationPriorityLevel.UserInput
    lazy                : boolean       = true
    sync                : boolean       = true

    // TODO Atom should "implement Meta" and by default, should be `this.$meta = this`
    $meta               : Meta          = undefined


    initialize () {
        const boundGraph    = this.boundGraph

        if (boundGraph) boundGraph.addAtom(this)
    }


    get boundGraph () : ChronoGraph {
        return undefined
    }


    get meta () : Meta {
        if (this.$meta !== undefined) return this.$meta

        const cls = this.constructor as AnyConstructor<this, typeof Atom>

        return this.$meta = cls.meta
    }

    set meta (meta : Meta) {
        this.$meta      = meta

        this.lazy       = meta.lazy
        this.sync       = meta.sync
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

    // get lazy () : boolean {
    //     if (this.$lazy !== undefined) return this.$lazy
    //
    //     return this.$lazy = this.meta.lazy
    // }
    // set lazy (value : boolean) {
    //     this.$lazy = value
    // }
    //endregion


    immutableForWrite () : this[ 'immutable' ] {
        if (this.immutable.frozen) this.setCurrent(this.immutable.createNext())

        return this.immutable
    }


    buildDefaultImmutable () : Quark {
        return undefined
    }


    enterGraph (graph : ChronoGraph) {
        // <debug>
        if (this.graph && this.graph !== graph) throw new Error("Atom can only belong to a single graph")
        // </debug>

        this.graph                  = graph
    }


    leaveGraph (graph : ChronoGraph) {
        // <debug>
        if (this.graph !== graph) throw new Error("Atom not in graph")
        // </debug>

        this.doCleanup()

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
        clone.$meta     = this.$meta

        clone.lazy      = this.lazy
        clone.sync      = this.sync

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


    resetCalculation (keepProposed : boolean) {
        throw new Error("Abstract method")
    }


    read (graph? : ChronoGraph) : this[ 'V' ] {
        throw new Error("Abstract method")
    }

    // this breaks the `isNumber()` typeguard on Atom instance
    // [Symbol.toPrimitive] () : V {
    //     return this.read()
    // }


    async readAsync (graph? : ChronoGraph) : Promise<V> {
        return this.read()
    }


    get value () : V {
        return this.read()
    }


    get valueAsync () : Promise<V> {
        return this.readAsync()
    }


    readProposedOrPrevious () : V {
        throw new Error("Abstract method")
    }


    readProposed () : V {
        throw new Error("Abstract method")
    }


    readProposedArgs () : unknown[] {
        throw new Error("Abstract method")
    }


    readPrevious () : V {
        throw new Error("Abstract method")
    }


    readConsistentOrProposedOrPrevious () : V {
        throw new Error("Abstract method")
    }


    materializeCachedStateIntoQuark () {
        const nextQuark     = this.stateQuark.createNext()

        nextQuark.state     = this.$state

        nextQuark.freeze()

        const stateIteration    = this.stateIteration.getMergedIntoRecursive() || this.stateIteration

        stateIteration.forceAddQuark(nextQuark)
    }


    // TODO
    // it seems the trick with temporary storing of state on atom is actually making
    // the `shallow_changes` benchmark slower?? (the whole point of the trick was
    // to speed up that particular use case)
    // remove it then? removing makes some other benchmarks better
    // UPDATE: the `graphful/shallow_changes_gen` benchmark improves from 373ms to 247ms
    // with this optimization
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

        // TODO (!!)
        // need a proper mechanism of ignoring the state shift from `Calculating` to `Stale`
        // if its a part of the same batch, caused by the calculation re-ordering
        // if (this.state == AtomState.Calculating && state === AtomState.Stale) return

        // TODO should be: immutable.frozen && "not a zero quark"
        // OR, remove the concept of zero quark, then: `immutable && immutable.frozen`
        if (immutable.frozen && immutable.previous && this.graph) {
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
        // const activeAtom    = this.graph.activeAtom
        // const activeGraph   = activeAtom ? activeAtom.graph : undefined
        //
        // if (this.graph && activeGraph && activeGraph !== this.graph && activeGraph.identity === this.graph.identity && activeGraph.previous)
        //     return activeGraph.checkout(this)
        // else
            return this
    }


    // TODO unify with `checkoutSelf`
    checkoutSelfFromActiveGraph (activeGraph : ChronoGraph) : this {
        if (this.graph && activeGraph !== this.graph && activeGraph.identity === this.graph.identity && activeGraph.previous)
            return activeGraph.checkout(this)
        else
            return this
    }


    // should only be used in undo/redo context
    resetQuark (quark : Quark) {
        const newValue      = quark.readRaw()
        const oldValue      = this.immutable.readRaw()

        if (!this.equality(newValue, oldValue)) this.propagateDeepStaleOutsideOfGraph(true)

        this.immutable          = quark

        this.userInputRevision  = quark.revision

        if (this.$commitValueOptimisticHook) this.$commitValueOptimisticHook.trigger(this, newValue, oldValue)
    }


    isValueVulnerableToChanges () : boolean {
        const state         = this.state

        return state === AtomState.UpToDate || state === AtomState.Calculating
    }


    propagatePossiblyStale (includePast : boolean) {
        const toVisit : Quark[]         = [ this.immutable ]

        while (toVisit.length) {
            const quark     = toVisit.pop()

            const atom      = quark.owner

            if (atom.isValueVulnerableToChanges()) {
                atom.state              = AtomState.PossiblyStale
                atom.userInputRevision  = this.userInputRevision

                if (atom.graph && !atom.lazy) {
                    atom.graph.addPossiblyStaleStrictAtomToTransaction(atom)
                }

                quark.forEachOutgoing(includePast, (outgoing, atom) => {
                    if (atom.isValueVulnerableToChanges()) toVisit.push(atom.immutable)
                })
            }
        }
    }


    propagateDeepStaleOutsideOfGraph (includePast : boolean) {
        const toVisit1 : Quark[]    = []

        const graph                 = this.graph

        this.immutable.forEachOutgoing(includePast, (outgoing, atom) => {
            if (atom.graph !== graph) {
                // only go deeper if state was UpToDate
                if (atom.isValueVulnerableToChanges()) toVisit1.push(atom.immutable)

                // but reset to stale anyway
                atom.state              = AtomState.Stale
                atom.userInputRevision  = this.userInputRevision
            }
        })

        // seems we should not clear outgoing in `propagateDeepStaleOutsideOfGraph`
        // it is only used in undo/redo, which means the quark will be always frozen,
        // so this condition is always false
        // if (!this.immutable.frozen) this.immutable.clearOutgoing()

        const toVisit2 : Quark[]         = []

        for (let i = 0; i < toVisit1.length; i++) {
            const quark     = toVisit1[ i ]

            quark.forEachOutgoing(includePast, (outgoing, atom) => {
                if (atom.isValueVulnerableToChanges()) toVisit2.push(atom.immutable)
            })
        }

        while (toVisit2.length) {
            const quark     = toVisit2.pop()

            const atom      = quark.owner

            if (atom.isValueVulnerableToChanges()) {
                atom.state              = AtomState.PossiblyStale
                atom.userInputRevision  = this.userInputRevision

                if (atom.graph && !atom.lazy) {
                    atom.graph.addPossiblyStaleStrictAtomToTransaction(atom)
                }

                quark.forEachOutgoing(includePast, (outgoing, atom) => {
                    if (atom.graph !== graph) {
                        if (atom.isValueVulnerableToChanges()) toVisit2.push(atom.immutable)
                    }
                })
            }
        }
    }


    // immediate outgoings should become stale, further outgoings - possibly stale
    propagateStaleDeep (includePast : boolean) {
        const toVisit1 : Quark[]         = []

        this.immutable.forEachOutgoing(includePast, (outgoing, atom) => {
            // only go deeper if state was UpToDate
            if (atom.isValueVulnerableToChanges()) {
                toVisit1.push(atom.immutable)

                if (atom.graph && !atom.lazy) {
                    atom.graph.addPossiblyStaleStrictAtomToTransaction(atom)
                }
            }

            // but reset to stale anyway
            atom.state              = AtomState.Stale
            atom.userInputRevision  = this.userInputRevision
        })

        if (!this.immutable.frozen) this.immutable.clearOutgoing()

        const toVisit2 : Quark[]         = []

        for (let i = 0; i < toVisit1.length; i++) {
            const quark     = toVisit1[ i ]

            quark.forEachOutgoing(includePast, (outgoing, atom) => {
                if (atom.isValueVulnerableToChanges()) toVisit2.push(atom.immutable)
            })
        }

        while (toVisit2.length) {
            const quark     = toVisit2.pop()

            const atom      = quark.owner

            if (atom.isValueVulnerableToChanges()) {
                atom.state              = AtomState.PossiblyStale
                atom.userInputRevision  = this.userInputRevision

                if (atom.graph && !atom.lazy) {
                    atom.graph.addPossiblyStaleStrictAtomToTransaction(atom)
                }

                quark.forEachOutgoing(includePast, (outgoing, atom) => {
                    if (atom.isValueVulnerableToChanges()) toVisit2.push(atom.immutable)
                })
            }
        }
    }


    propagateStaleShallow (includePast : boolean) {
        const userInputRevision  = this.userInputRevision

        this.immutable.forEachOutgoing(includePast, (quark, atom) => {
            const state     = atom.state

            if (atom.graph && !atom.lazy && state === AtomState.UpToDate) {
                atom.graph.addPossiblyStaleStrictAtomToTransaction(atom)
            }

            if (state !== AtomState.Calculating || atom.userInputRevision < userInputRevision) {
                atom.state              = AtomState.Stale
                atom.userInputRevision  = userInputRevision
            }
        })

        if (!this.immutable.frozen && !this.graph.activeAtom) this.immutable.clearOutgoing()
    }


    onCyclicReadDetected () {
        const cyclicReadException   = this.getCyclicReadException()

        if (this.graph) {
            switch (this.graph.onComputationCycle) {
                case 'throw' :
                    throw cyclicReadException
                case 'reject' :
                    this.graph.reject(cyclicReadException)
                    break
                case 'warn' :
                    warn(cyclicReadException)
                    break
            }
        } else
            throw cyclicReadException
    }


    // go deep and detect if there's a cyclic read situation indeed,
    // or it is just blocked on awaiting the promise
    cyclicReadIsBlockedOnPromiseOrCheckDeps () : boolean {
        const uniqable              = getUniqable()

        let atom                    = this

        while (atom) {
            if (atom.uniqable2 === uniqable) return false

            atom.uniqable2          = uniqable

            if (!atom.iterationResult) return false

            const iterationValue    = atom.iterationResult.value

            // encountered an atom, blocked on promise - possibly not a cycle, need to await the promise resolution
            if (iterationValue instanceof Promise) return true

            // encountered an atom, in `CheckingDeps` or `Stale` state - possibly not a cycle, need to start calculation
            // of that atom
            if ((iterationValue instanceof Atom) && (iterationValue.state === AtomState.CheckingDeps || iterationValue.state === AtomState.Stale)) {
                iterationValue.state = AtomState.Stale
                return true
            }

            atom                    = iterationValue
        }
    }


    getWalkDepthContext (cycleRef : { cycle : ComputationCycle }) : WalkContext<Atom> {
        return WalkDepthC({
            collectNext (node : Atom, toVisit : WalkStep<Atom>[], visitInfo : VisitInfo) {
                const incoming = node.immutable.getIncomingDeep()

                incoming && incoming.forEach((quark) => toVisit.push({ node : quark.owner, from : node, label : null }))
            },
            onCycle (node : Atom, stack : WalkStep<Atom>[]) : OnCycleAction {
                cycleRef.cycle = ComputationCycle.new({ cycle : cycleInfo(stack) })

                return OnCycleAction.Cancel
            }
        })
    }


    getCyclicReadException () : ComputationCycleError | undefined {
        let cycleRef : { cycle : ComputationCycle }  = { cycle : null }

        this.getWalkDepthContext(cycleRef).startFrom([ this ])

        if (cycleRef.cycle) {
            const exception = new ComputationCycleError("Computation cycle:\n" + cycleRef.cycle)

            exception.cycle = cycleRef.cycle

            return exception
        } else {
            return undefined
        }
    }


    doCleanup () {
    }


    onUnused () {
        if (!this.persistent && this.graph) this.graph.removeAtom(this)
    }
}
