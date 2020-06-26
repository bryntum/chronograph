import { Base } from "../class/Base.js"
import { AnyConstructor } from "../class/Mixin.js"
import { LeveledQueue } from "../util/LeveledQueue.js"
import { getUniqable } from "../util/Uniqable.js"
import { ChronoIteration } from "./ChronoIteration.js"
import { ChronoTransaction } from "./ChronoTransaction.js"
import { Box, BoxImmutable } from "./data/Box.js"
import { Owner } from "./data/Immutable.js"
import { Atom, AtomState, Quark } from "./Quark.js"


//----------------------------------------------------------------------------------------------------------------------
export class ChronoGraph extends Base implements Owner {
    historyLimit            : number                = 0

    stack                   : LeveledQueue<Quark>   = new LeveledQueue()

    topTransaction          : ChronoTransaction     = undefined

    nextTransaction         : ChronoTransaction[]   = []


    previous                : this                  = undefined

    atomsById               : { [key : number] : Atom }   = Object.create(null)


    //region ChronoGraph as Owner
    $immutable              : ChronoTransaction     = undefined

    get immutable () : ChronoTransaction {
        if (this.$immutable !== undefined) return this.$immutable

        return this.$immutable = ChronoTransaction.new({ owner : this })
    }

    set immutable (value : ChronoTransaction) {
        this.$immutable = value
    }


    immutableForWrite () : this[ 'immutable' ] {
        if (this.immutable.frozen) this.setCurrent(this.immutable.createNext())

        return this.immutable
    }


    setCurrent (immutable : this[ 'immutable' ]) {
        if (this.immutable && immutable && immutable.previous !== this.immutable) throw new Error("Invalid state thread")

        this.immutable          = immutable

        // TODO should somehow not clear the `nextTransaction` for the resolution of lazy atoms?
        // the use case is - user "undo", then read some lazy values - that creates "new history" and clears the
        // `nextTransaction` axis making "redo" impossible,
        // however, from the user perspective s/he only reads the data, which should be pure
        this.nextTransaction    = []
    }
    //endregion


    get currentTransaction () : ChronoTransaction {
        return this.immutable
    }


    get currentIteration () : ChronoIteration {
        return this.immutable.immutable
    }


    commit () {
        this.calculateTransitionsSync()

        this.immutable.freeze()
    }


    reject () {
        // nothing to reject
        if (this.immutable.frozen) return

        this.undoTo(this.immutable, this.immutable.previous)

        this.immutable  = this.immutable.previous
    }


    undo () {
        this.reject()

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


    branch () : this {
        this.immutable.freeze()

        const self      = this.constructor as AnyConstructor<this, typeof ChronoGraph>
        const next      = new self()

        next.previous   = this
        next.immutable  = this.immutable

        return next
    }


    checkout<T extends Atom> (atom : T) : T {
        if (!this.previous) throw new Error("Graph is not a branch - can not checkout")

        const existingAtom  = this.atomsById[ atom.id ]

        if (existingAtom !== undefined) return existingAtom as T

        const clone     = atom.clone()

        clone.graph     = this

        const immutable = clone.immutable = this.getLatestQuarkOf(atom).createNext()
        immutable.owner = clone

        if ((immutable as BoxImmutable).readRaw() !== undefined) clone.state = AtomState.UpToDate

        return this.atomsById[ clone.id ]  = clone
    }


    getLatestQuarkOf<T extends Atom> (atom : T) : Quark {
        let iteration : ChronoIteration     = this.immutable.immutable

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
    undoTo (sourceTransaction : ChronoTransaction, tillTransaction : ChronoTransaction) {
        let iteration           = sourceTransaction.immutable
        const stopAt : ChronoIteration  = tillTransaction ? tillTransaction.immutable : undefined

        const uniqable          = getUniqable()

        const atoms : Atom[]    = []

        while (true) {
            const quarks        = iteration.quarks

            for (let i = 0; i < quarks.length; i++) {
                const quark     = quarks[ i ]
                const atom      = quark.owner

                if (atom.uniqable !== uniqable) {
                    atom.uniqable       = uniqable

                    atom.uniqableBox    = quark

                    atoms.push(atom)
                } else {
                    atom.uniqableBox    = quark
                }
            }

            iteration           = iteration.previous

            if (iteration === stopAt) break
        }

        for (let i = 0; i < atoms.length; i++) {
            const atom          = atoms[ i ]
            const deepestQuark  = atom.uniqableBox as Quark

            atom.updateQuark(deepestQuark.previous)

            atom.uniqableBox    = undefined
        }
    }


    // TODO remove the `sourceTransaction` argument
    redoTo (sourceTransaction : ChronoTransaction, tillTransaction : ChronoTransaction) {
        let iteration           = tillTransaction.immutable
        const stopAt : ChronoIteration  = sourceTransaction.immutable

        const uniqable          = getUniqable()

        const atoms : Atom[]    = []

        while (true) {
            const quarks        = iteration.quarks

            for (let i = 0; i < quarks.length; i++) {
                const quark     = quarks[ i ]
                const atom      = quark.owner

                if (atom.uniqable !== uniqable) {
                    atom.uniqable       = uniqable

                    atom.uniqableBox    = quark

                    atoms.push(atom)
                } else {
                    // atom.uniqableBox    = quark
                }
            }

            iteration           = iteration.previous

            if (iteration === stopAt) break
        }

        for (let i = 0; i < atoms.length; i++) {
            const atom          = atoms[ i ]
            const deepestQuark  = atom.uniqableBox as Quark

            atom.updateQuark(deepestQuark)

            atom.uniqableBox    = undefined
        }
    }

}
