import { Base } from "../../class/Base.js"
import { AnyConstructor } from "../../class/Mixin.js"
import { LeveledQueue } from "../../util/LeveledQueue.js"
import { Atom } from "../atom/Atom.js"
import { ChronoReference } from "../atom/Identifiable.js"
import { AtomState, Quark } from "../atom/Quark.js"
import { Box, ZeroBox } from "../data/Box.js"
import { Owner } from "../data/Immutable.js"
import { Iteration, IterationStorage, IterationStorageShredding } from "./Iteration.js"
import { Transaction } from "./Transaction.js"

//----------------------------------------------------------------------------------------------------------------------
export type GarbageCollectionStrategy = 'eager' //| 'batched' | 'on_idle'


//----------------------------------------------------------------------------------------------------------------------
export class ChronoGraph extends Base implements Owner {
    // how many "extra" transactions to keep in memory (except the one currently running)
    historyLimit            : number                = -1

    // move to Transaction? by definition, transaction ends when the stack is exhausted
    // (all strict effects observed)
    stack                   : LeveledQueue<Quark>   = new LeveledQueue()

    nextTransaction         : Transaction[]         = []

    // filled in branches
    previous                : this                  = undefined

    // historySource           : Map<ChronoReference, Quark>   = new Map()
    // historySource           : Iteration   = undefined

    atomsById               : Map<ChronoReference, Atom>    = new Map()


    //region ChronoGraph as Owner
    $immutable              : Transaction           = undefined

    garbageCollection       : GarbageCollectionStrategy     = 'eager'

    // special flag only used for `historyLimit === 0` case
    // indicates the current transaction is "frozen"
    // we use it to avoid unnecessary freezing / thawing of the transaction
    // it is handling the "reject immediately after commit should do nothing" condition
    frozen                  : boolean               = false


    initialize<T extends ChronoGraph> (props? : Partial<T>) {
        super.initialize(props)

        this.mark()
    }


    destroy () {
        this.unmark()

        this.atomsById      = undefined
        // this.historySource  = undefined

        let iteration : Iteration = this.currentIteration

        while (iteration && iteration.refCount === 0) {
            const previous  = iteration.previous

            iteration.destroy()

            iteration       = previous
        }
    }


    get immutable () : Transaction {
        if (this.$immutable !== undefined) return this.$immutable

        const zeroIteration     = Iteration.new({
            storage : this.historyLimit >= 0 ? new IterationStorageShredding() : new IterationStorage()
        })

        // pass through the setter for the mark/unmark side effect
        return this.immutable   = Transaction.new({ immutable : zeroIteration })
    }

    // this is assignment "within" the undo/redo history, keeps the redo information
    set immutable (immutable : Transaction) {
        this.unmark()

        this.$immutable = immutable
        if (immutable) immutable.owner = this

        this.mark()
    }


    immutableForWrite () : this[ 'immutable' ] {
        if (this.immutable.frozen) this.setCurrent(this.immutable.createNext())

        return this.immutable
    }


    // this is assignment of the new transaction, clears the redo information
    setCurrent (immutable : this[ 'immutable' ]) {
        if (this.immutable && immutable && immutable.previous !== this.immutable) throw new Error("Invalid state thread")

        this.unmark()

        this.$immutable         = immutable
        immutable.owner         = this

        // TODO should somehow not clear the `nextTransaction` for the resolution of lazy atoms?
        // the use case is - user "undo", then read some lazy values - that creates "new history" and clears the
        // `nextTransaction` axis making "redo" impossible,
        // however, from the user perspective s/he only reads the data, which should be pure
        this.nextTransaction    = []

        this.mark()
        // this.sweep()
    }
    //endregion


    getLastIteration () : Iteration {
        let iteration : Iteration     = this.immutable.immutable

        while (iteration) {
            const previous  = iteration.previous

            if (!previous) return iteration

            iteration       = previous
        }

        return undefined
    }


    sweep () {
        let lastReachableTransaction : Transaction

        this.forEveryTransactionInHistory((transaction, reachable) => {
            if (reachable) lastReachableTransaction = transaction
        })

        // empty graph
        if (!lastReachableTransaction) return

        const lastReachableIteration    = lastReachableTransaction.immutable

        let iteration : Iteration       = lastReachableIteration

        const iterations : Iteration[]  = []

        while (iteration) {
            iterations.push(iteration)

            iteration   = iteration.previous
        }

        const lastIteration             = iterations[ iterations.length - 1 ]

        let collapseStartingFrom : Iteration
        let nextAfterCollapsible : Iteration

        for (let i = iterations.length - 1; i > 0; i--) {
            const currentIteration  = iterations[ i ]

            if (currentIteration.canBeCollapsedWithNext()) {
                collapseStartingFrom    = currentIteration
                nextAfterCollapsible    = iterations[ i - 1 ]
            } else
                break
        }

        if (!nextAfterCollapsible || nextAfterCollapsible === lastIteration) return

        nextAfterCollapsible.forEveryFirstQuarkTill(lastIteration, quark => {
            const owner                     = quark.owner

            // this.historySource.set(owner.id, quark)
            lastIteration.storage.addQuark(quark)

            quark.iteration = undefined

            // set the magic data
            owner.identity.uniqableBox      = quark
        })

        nextAfterCollapsible.forEveryFirstQuarkTill(lastIteration, quark => {
            // magic dependency on `this.owner.identity.uniqableBox`
            quark.collectGarbage()
        })

        iteration                           = collapseStartingFrom

        nextAfterCollapsible.storage        = lastIteration.storage

        // this.historySource                  = nextAfterCollapsible

        nextAfterCollapsible.previous       = undefined
        nextAfterCollapsible.owner.previous = undefined

        while (iteration) {
            const previous  = iteration.previous

            iteration.destroy()

            iteration   = previous
        }
    }


    mark () {
        this.forEveryTransactionInHistory((transaction, reachable) => transaction.mark(reachable))
    }


    unmark () {
        this.forEveryTransactionInHistory((transaction, reachable) => transaction.unmark(reachable))
    }


    forEveryTransactionInHistory (func : (transaction : Transaction, reachable : boolean) => any) {
        let transaction         = this.nextTransaction.length > 0 ? this.nextTransaction[ 0 ] : this.$immutable

        for (let i = 0; transaction; i++) {
            func(transaction, i <= this.historyLimit)

            transaction         = transaction.previous
        }
    }


    get currentTransaction () : Transaction {
        return this.immutable
    }


    get currentIteration () : Iteration {
        return this.immutable.immutable
    }


    calculateTransitionsSync () {
        const queue                             = this.stack

        while (queue.length) {
            this.calculateTransitionsStackSync(queue.takeLowestLevel())
        }
    }


    calculateTransitionsStackSync (stack : Quark[]) {
        for (let i = 0; i < stack.length; i++) {
            const atom = stack[ i ].owner as Box<any>

            if (atom.state !== AtomState.UpToDate) atom.read()
        }
    }


    commit () {
        this.calculateTransitionsSync()

        if (this.historyLimit >= 0) {
            this.immutable.freeze()
        } else {
            this.frozen = true
        }

        this.sweep()
    }


    reject () {
        // nothing to reject
        if (this.frozen || this.immutable.frozen) return

        this.immutable.reject()

        this.undoTo(this.immutable, this.immutable.previous)

        this.immutable  = this.immutable.previous

        this.stack.clear()
    }


    undo () {
        this.reject()

        if (!this.immutable.previous) return

        this.undoTo(this.immutable, this.immutable.previous)

        this.nextTransaction.push(this.immutable)

        this.immutable  = this.immutable.previous
    }


    redo () {
        if (!this.nextTransaction.length) return

        const nextTransaction   = this.nextTransaction[ this.nextTransaction.length - 1 ]

        // using property instead of lazy accessor to avoid creation
        // of transaction
        this.redoTo(this.$immutable, nextTransaction)

        this.immutable          = nextTransaction

        // need to mutate the `nextTransaction` at the end, after all
        // mark/unmark operations has completed
        this.nextTransaction.pop()
    }


    branch (config? : Partial<this>) : this {
        // we freeze current _iteration_, not the whole _transaction_
        this.currentIteration.freeze()

        const self          = this.constructor as AnyConstructor<this, typeof ChronoGraph>
        const branch        = self.new(config)

        branch.previous         = this
        // TODO should use copy-on-write?
        // branch.historySource    = this.historySource.clone()

        const partialTransaction        = this.currentTransaction.previous
            ?
                this.currentTransaction.previous.createNext(branch)
            :
                Transaction.new({ owner : branch })

        partialTransaction.immutable    = this.currentIteration.createNext(partialTransaction)

        branch.immutable                = partialTransaction

        // increase the `nextCounter`
        // this.currentTransaction.immutable = this.currentIteration.createNext()

        return branch
    }


    checkout<T extends Atom> (atom : T) : T {
        if (atom.graph === this) return atom

        // TODO
        // @ts-ignore
        if (atom === ZeroBox) return ZeroBox

        if (!this.previous) throw new Error("Graph is not a branch - can not checkout")

        const existingAtom  = this.atomsById.get(atom.id)

        if (existingAtom !== undefined) return existingAtom as T

        const clone     = atom.clone()

        clone.graph     = this

        // might be more performant to checkout everything at once, since
        // most of our revisions going to be array-based?
        // yes, probably should gather the latest quarks in the map right away
        // can keep `latestQuarks` in the branch + use storage of the last iteration
        const immutable = this.getLatestQuarkOf(atom).createNext(clone)

        clone.immutable = undefined
        clone.setCurrent(immutable)

        // if ((immutable as BoxImmutable).readRaw() !== undefined) clone.state = AtomState.UpToDate

        this.atomsById.set(clone.id, clone)

        return clone
    }


    getLatestQuarkOf<T extends Atom> (atom : T) : Quark {
        const transaction       = this.$immutable || this.immutable
        const iteration         = transaction.$immutable || transaction.immutable

        return iteration.getLatestQuarkOf(atom)
    }


    addAtom (atom : Atom) {
        atom.enterGraph(this)

        this.immutableForWrite().addQuark(atom.immutable)

        if (!atom.lazy) this.addPossiblyStaleStrictAtomToTransaction(atom)
    }

    addAtoms (atoms : Atom[]) {
        atoms.forEach(atom => this.addAtom(atom))
    }


    removeAtom (atom : Atom) {
        atom.leaveGraph(this)
    }

    removeAtoms (atoms : Atom[]) {
        atoms.forEach(atom => this.removeAtom(atom))
    }


    addPossiblyStaleStrictAtomToTransaction (atom : Atom) {
        this.stack.push(atom.immutable)
    }


    registerQuark (quark : Quark) {
        this.immutableForWrite().addQuark(quark)
    }


    // TODO remove the `sourceTransaction` argument
    undoTo (sourceTransaction : Transaction, tillTransaction : Transaction) {
        const atoms : Atom[]    = []

        sourceTransaction.immutable.forEveryQuarkTill(
            tillTransaction ? tillTransaction.immutable : undefined,

            (quark, first) => {
                if (first) atoms.push(quark.owner)

                quark.owner.identity.uniqableBox    = quark
            }
        )

        // TODO becnhmark if one more pass through the `forEveryQuarkTill` is faster
        // than memoizing atoms in array
        for (let i = 0; i < atoms.length; i++) {
            const atom          = atoms[ i ]
            const deepestQuark  = atom.identity.uniqableBox as Quark

            this.checkout(atom).resetQuark(deepestQuark.previous)

            atom.identity.uniqableBox = undefined
        }
    }


    // TODO remove the `sourceTransaction` argument
    redoTo (sourceTransaction : Transaction, tillTransaction : Transaction) {
        const atoms : Atom[]    = []

        tillTransaction.immutable.forEveryQuarkTill(
            sourceTransaction ? sourceTransaction.immutable : undefined,

            (quark, first) => {
                if (first) {
                    atoms.push(quark.owner)

                    quark.owner.identity.uniqableBox    = quark
                }
            }
        )

        // TODO becnhmark if one more pass through the `forEveryQuarkTill` is faster
        // than memoizing atoms in array
        for (let i = 0; i < atoms.length; i++) {
            const atom          = atoms[ i ]
            const deepestQuark  = atom.identity.uniqableBox as Quark

            this.checkout(atom).resetQuark(deepestQuark)

            atom.identity.uniqableBox   = undefined
        }
    }

}
