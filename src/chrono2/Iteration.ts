import { Base } from "../class/Base.js"
import { AnyConstructor } from "../class/Mixin.js"
import { MIN_SMI } from "../util/Helpers.js"
import { Uniqable } from "../util/Uniqable.js"
import { Box } from "./data/Box.js"
import { Immutable, Owner } from "./data/Immutable.js"
import { ChronoId, Identifiable } from "./Identifiable.js"
import { Atom, Quark } from "./Quark.js"


const TombStone = null

//----------------------------------------------------------------------------------------------------------------------
export class ChronoIteration extends Immutable {
    owner       : ChronoTransaction

    quarks      : Map<ChronoId, Quark> = new Map()


    getQuarkById (id : ChronoId) : Quark | null {
        let iteration : this = this

        while (iteration) {
            const quark = iteration.quarks.get(id)

            if (quark !== undefined) return quark

            iteration   = iteration.previous
        }

        return null
    }


    addQuark (quark : Quark) {
        this.quarks.set(quark.owner.id, quark)
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

        return this.$immutable = ChronoIteration.new({ owner : this })
    }

    set immutable (value : ChronoIteration) {
        this.$immutable = value
    }


    setCurrent (immutable : ChronoIteration) {
        if (this.$immutable && immutable.previous !== this.immutable) throw new Error("Invalid state thread")

        if (this.frozen) {
            const next = this.createNext()

            this.owner.setCurrent(next)

            next.setCurrent(immutable)
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
export class ChronoGraph extends Base implements Owner, Uniqable {
    uniqable        : number                = MIN_SMI

    //region ChronoGraph as Owner
    immutable       : ChronoTransaction     = ChronoTransaction.new({ owner : this })


    setCurrent (immutable : this[ 'immutable' ]) {
        if (this.immutable && immutable && immutable.previous !== this.immutable) throw new Error("Invalid state thread")

        this.immutable = immutable
    }
    //endregion


    commit () {
        const atoms = this.atomsA

        for (let i = 0; i < atoms.length; i++) {
            const atom = atoms[ i ] as Box

            atom.read()

            atom.freeze()

            this.immutable.addQuark(atom.immutable)
        }

        this.immutable.freeze()
    }

    reject () {
    }


    atoms       : Set<Atom>                 = new Set()


    $atomsA     : Atom[]                    = undefined

    get atomsA () : Atom[] {
        if (this.$atomsA !== undefined) return this.$atomsA

        return this.$atomsA = Array.from(this.atoms)
    }


    hasAtom (atom : Atom) : boolean {
        return this.atoms.has(atom)
    }


    addAtom (atom : Atom) {
        this.atoms.add(atom)

        atom.enterGraph(this)

        this.$atomsA = undefined
    }

    addAtoms (atoms : Atom[]) {
        atoms.forEach(atom => this.addAtom(atom))
    }


    removeAtom (atom : Atom) {
        this.atoms.delete(atom)

        atom.leaveGraph(this)

        this.$atomsA = undefined
    }
}
