import { Base } from "../../class/Base.js"
import { AnyConstructor } from "../../class/Mixin.js"
import { LeveledQueue } from "../../util/LeveledQueue.js"
import { Atom } from "../atom/Atom.js"
import { AtomState, Quark } from "../atom/Quark.js"
import { Box, BoxImmutable } from "../data/Box.js"
import { Owner } from "../data/Immutable.js"
import { Iteration, ZeroIteration } from "./Iteration.js"
import { Transaction, ZeroTransaction } from "./Transaction.js"


//----------------------------------------------------------------------------------------------------------------------
export class ChronoGraph extends Base implements Owner {
    // how many frozen transactions to keep in memory
    historyLimit            : number                = 0

    stack                   : LeveledQueue<Quark>   = new LeveledQueue()

    nextTransaction         : Transaction[]   = []


    previous                : this                  = undefined

    nextCache               : Map<Transaction, Transaction>     = new Map()
    historySource           : Iteration             = ZeroIteration

    atomsById               : Map<number, Atom>     = new Map()


    //region ChronoGraph as Owner
    $immutable              : Transaction     = ZeroTransaction

    garbageCollection       : 'eager' | 'batched' | 'onidle'    = 'batched'


    initialize<T extends ChronoGraph> (props? : Partial<T>) {
        super.initialize(props)

        this.mark()
    }


    destroy () {
        this.unmark()
    }


    get immutable () : Transaction {
        if (this.$immutable !== undefined) return this.$immutable

        return this.$immutable = Transaction.new({ owner : this })
    }

    // this is assignment "within" the undo/redo history, keeps the redo information
    set immutable (value : Transaction) {
        this.unmark()

        this.$immutable = value

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

        // TODO should somehow not clear the `nextTransaction` for the resolution of lazy atoms?
        // the use case is - user "undo", then read some lazy values - that creates "new history" and clears the
        // `nextTransaction` axis making "redo" impossible,
        // however, from the user perspective s/he only reads the data, which should be pure
        this.nextTransaction    = []

        this.mark()
        this.sweep()
    }
    //endregion


    getLastIteration () : Iteration {
        let iteration : Iteration     = this.immutable.immutable

        while (iteration) {
            const previous  = iteration.previous

            if (!previous) return iteration

            iteration   = previous
        }

        return undefined
    }


    sweep () {
        let firstUnreachableTransaction : Transaction

        this.forEveryTransactionInHistory((transaction, reachable) => {
            if (!reachable && !firstUnreachableTransaction) firstUnreachableTransaction = transaction
        })

        const shredingIteration = this.getLastIteration()

        if (firstUnreachableTransaction && firstUnreachableTransaction.$immutable !== shredingIteration) {
            firstUnreachableTransaction.$immutable  = shredingIteration.consume(firstUnreachableTransaction.immutable)
            firstUnreachableTransaction.previous    = undefined
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

            transaction      = transaction.previous
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

        if (this.historyLimit > 0) this.immutable.freeze()
    }


    reject () {
        // nothing to reject
        if (this.immutable.frozen) return

        this.undoTo(this.immutable, this.immutable.previous)

        this.immutable  = this.immutable.previous
    }


    undo () {
        this.reject()

        if (this.historyLimit === 0) return

        this.undoTo(this.immutable, this.immutable.previous)

        this.nextTransaction.push(this.immutable)

        this.immutable  = this.immutable.previous
    }


    redo () {
        if (!this.nextTransaction.length) return

        const nextTransaction   = this.nextTransaction.pop()

        this.redoTo(this.immutable, nextTransaction)

        this.immutable          = nextTransaction
    }


    branch (config? : Partial<this>) : this {
        // we freeze current _iteration_, not the whole _transaction_
        this.currentIteration.freeze()

        const self          = this.constructor as AnyConstructor<this, typeof ChronoGraph>
        const branch        = self.new(config)

        branch.previous     = this

        const partialTransaction        = this.currentTransaction.previous.createNext(branch)

        partialTransaction.immutable    = this.currentIteration.createNext(partialTransaction)

        branch.immutable                = partialTransaction

        return branch
    }


    checkout<T extends Atom> (atom : T) : T {
        if (atom.graph === this) return atom

        if (!this.previous) throw new Error("Graph is not a branch - can not checkout")

        const existingAtom  = this.atomsById.get(atom.id)

        if (existingAtom !== undefined) return existingAtom as T

        const clone     = atom.clone()

        clone.graph     = this

        const immutable = this.getLatestQuarkOf(atom).createNext(clone)

        clone.immutable = undefined
        clone.setCurrent(immutable)

        if ((immutable as BoxImmutable).readRaw() !== undefined) clone.state = AtomState.UpToDate

        this.atomsById.set(clone.id, clone)

        return clone
    }


    getLatestQuarkOf<T extends Atom> (atom : T) : Quark {
        let iteration : Iteration     = this.immutable.immutable

        const atomId    = atom.id

        while (iteration) {
            const quarks    = iteration.quarks

            for (let i = 0; i < quarks.length; i++) {
                if (quarks[ i ].owner.id === atomId) return quarks[ i ]
            }

            iteration   = iteration.previous
        }

        return undefined
    }


    addAtom (atom : Atom) {
        atom.enterGraph(this)

        this.immutableForWrite().addQuark(atom.immutable)
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

            this.checkout(atom).updateQuark(deepestQuark.previous)

            atom.identity.uniqableBox = undefined
        }
    }


    // TODO remove the `sourceTransaction` argument
    redoTo (sourceTransaction : Transaction, tillTransaction : Transaction) {
        const atoms : Atom[]    = []

        tillTransaction.immutable.forEveryQuarkTill(
            sourceTransaction.immutable,

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

            this.checkout(atom).updateQuark(deepestQuark)

            atom.identity.uniqableBox   = undefined
        }
    }

}
