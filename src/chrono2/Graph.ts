import { Base } from "../class/Base.js"
import { AnyConstructor } from "../class/Mixin.js"
import { MIN_SMI } from "../util/Helpers.js"
import { LeveledQueue } from "../util/LeveledQueue.js"
import { getUniqable, Uniqable } from "../util/Uniqable.js"
import { Box } from "./data/Box.js"
import { Immutable, Owner } from "./data/Immutable.js"
import { Atom, AtomState, Quark } from "./Quark.js"


// const TombStone = null

let revisionIdSource = Number.MIN_SAFE_INTEGER

//----------------------------------------------------------------------------------------------------------------------
export class ChronoIteration extends Immutable {
    owner       : ChronoTransaction

    quarks      : Quark[]       = []

    revision    : Revision      = revisionIdSource++

    // quarks      : Map<ChronoId, Quark> = new Map()
    //
    //
    // getQuarkById (id : ChronoId) : Quark | null {
    //     let iteration : this = this
    //
    //     while (iteration) {
    //         const quark = iteration.quarks.get(id)
    //
    //         if (quark !== undefined) return quark
    //
    //         iteration   = iteration.previous
    //     }
    //
    //     return null
    // }


    addQuark (quark : Quark) {
        // TODO setup dev/prod builds
        // <debug>
        if (this.frozen) throw new Error("Can't modify frozen data")
        if (quark.iteration && quark.iteration !== this) throw new Error("Quark already in another iteration")
        // </debug>

        if (quark.iteration === this) return

        // this.quarks.set(quark.owner.id, quark)
        this.quarks.push(quark)

        quark.iteration = this
    }


    freeze () {
        for (let i = 0; i < this.quarks.length; i++) this.quarks[ i ].freeze()

        super.freeze()
    }


    static new<T extends typeof ChronoIteration> (this : T, props? : Partial<InstanceType<T>>) : InstanceType<T> {
        const instance      = new this()

        Object.assign(instance, props)

        return instance as InstanceType<T>
    }
}


//----------------------------------------------------------------------------------------------------------------------
export class ChronoTransaction extends Owner implements Immutable {
    //region Transaction as Owner
    $immutable      : ChronoIteration       = undefined

    get immutable () : ChronoIteration {
        if (this.$immutable !== undefined) return this.$immutable

        return this.$immutable = ChronoIteration.new({ owner : this, previous : this.previous ? this.previous.immutable : undefined })
    }

    set immutable (value : ChronoIteration) {
        this.$immutable = value
    }


    setCurrent (immutable : ChronoIteration) {
        if (this.$immutable && immutable.previous !== this.immutable) throw new Error("Invalid state thread")

        if (this.frozen) {
            const next = this.createNext()

            this.owner.setCurrent(next)

            next.immutable  = immutable
        } else {
            this.immutable  = immutable
        }
    }
    //endregion

    //region transaction as Immutable
    owner       : ChronoGraph           = undefined

    previous    : this                  = undefined

    frozen      : boolean               = false


    createNext () : this {
        this.freeze()

        const self      = this.constructor as AnyConstructor<this, typeof ChronoTransaction>
        const next      = self.new()

        next.previous   = this
        next.owner      = this.owner

        next.immutable.previous = this.immutable

        return next
    }


    freeze () {
        if (this.frozen) return

        this.immutable.freeze()

        this.frozen = true
    }
    //endregion


    immutableForWrite () : this[ 'immutable' ] {
        if (this.immutable.frozen) this.setCurrent(this.immutable.createNext())

        return this.immutable
    }


    addQuark (quark : Quark) {
        this.immutableForWrite().addQuark(quark)
    }


    static new<T extends typeof ChronoTransaction> (this : T, props? : Partial<InstanceType<T>>) : InstanceType<T> {
        const instance      = new this()

        Object.assign(instance, props)

        return instance as InstanceType<T>
    }
}


//----------------------------------------------------------------------------------------------------------------------
export type Revision     = number

//----------------------------------------------------------------------------------------------------------------------
export class ChronoGraph extends Base implements Owner {
    historyLimit            : number                = 0

    stack                   : LeveledQueue<Quark>   = new LeveledQueue()

    topTransaction          : ChronoTransaction     = undefined

    nextTransaction         : ChronoTransaction[]   = []



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
