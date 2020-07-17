import { AnyConstructor } from "../../class/Mixin.js"
import { getUniqable } from "../../util/Uniqable.js"
import { Atom } from "../atom/Atom.js"
import { ChronoReference } from "../atom/Identifiable.js"
import { Quark } from "../atom/Quark.js"
import { Immutable, Owner } from "../data/Immutable.js"
import { Transaction } from "./Transaction.js"


let iterationIdSequence : number = 0

//----------------------------------------------------------------------------------------------------------------------
export class Iteration extends Immutable {
    name            : string            = `iteration#${iterationIdSequence++}`

    owner           : Transaction

    quarks          : Quark[]           = []

    // incremented by any owning graph, at any depth
    refCount        : number            = 0
    // incremented by any owning graph, at the depth of its `historyLimit`
    reachCount      : number            = 0
    // incremented by any following iteration
    // nextCount       : number            = 0

    isRejected      : boolean           = false


    // createNext (owner? : Owner) : this {
    //     const next      = super.createNext(owner)
    //
    //     this.nextCount++
    //
    //     return next
    // }


    mark (reachable : boolean) {
        this.refCount++

        if (reachable) this.reachCount++
    }


    unmark (reachable : boolean) {
        this.refCount--

        if (reachable) this.reachCount--
    }


    getLatestQuarkOfLocal<T extends Atom> (atomId : ChronoReference) : Quark | undefined {
        const quarks    = this.quarks

        for (let i = 0; i < quarks.length; i++) {
            if (quarks[ i ].owner.id === atomId) return quarks[ i ]
        }

        return undefined
    }


    getLatestQuarkOf<T extends Atom> (atom : T) : Quark {
        let iteration : Iteration     = this

        const atomId    = atom.id

        while (iteration) {
            const quark     = iteration.getLatestQuarkOfLocal(atomId)

            if (quark !== undefined) return quark

            iteration   = iteration.previous
        }

        return undefined
    }


    forEveryFirstQuarkTillLocal (uniqable : number, onFirstAtomOccurrence : (quark : Quark) => any) {
        const quarks        = this.quarks

        for (let i = 0; i < quarks.length; i++) {
            const quark     = quarks[ i ]
            const atom      = quark.owner

            if (atom.identity.uniqable !== uniqable) {
                atom.identity.uniqable      = uniqable

                onFirstAtomOccurrence(quark)
            }
        }
    }


    forEveryQuarkTillLocal (uniqable : number, onAtomOccurrence : (quark : Quark, first : boolean) => any) {
        const quarks        = this.quarks

        for (let i = 0; i < quarks.length; i++) {
            const quark     = quarks[ i ]
            const atom      = quark.owner

            if (atom.identity.uniqable !== uniqable) {
                atom.identity.uniqable      = uniqable

                onAtomOccurrence(quark, true)
            } else {
                onAtomOccurrence(quark, false)
            }
        }
    }


    forEveryQuarkTill (stopAt : Iteration, onAtomOccurrence : (quark : Quark, first : boolean) => any) {
        const uniqable          = getUniqable()

        let iteration           = this

        while (true) {
            iteration.forEveryQuarkTillLocal(uniqable, onAtomOccurrence)

            iteration           = iteration.previous

            if (iteration === stopAt) break
        }
    }


    forEveryFirstQuarkTill (stopAt : Iteration, onFirstAtomOccurrence : (quark : Quark) => any) {
        const uniqable          = getUniqable()

        let iteration           = this

        while (true) {
            iteration.forEveryFirstQuarkTillLocal(uniqable, onFirstAtomOccurrence)

            iteration           = iteration.previous

            if (iteration === stopAt) break
        }
    }


    clone () : this {
        const cls       = this.constructor as AnyConstructor<this, typeof Iteration>

        const clone     = new cls()

        clone.quarks    = this.quarks.slice()
        clone.previous  = this.previous

        return clone
    }


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


    // this is a bit controversial, but still need to figure out a test case that would exercise it
    forceAddQuark (quark : Quark) {
        if (quark.iteration === this) return

        this.quarks.push(quark)

        quark.iteration = this
    }


    freeze () {
        for (let i = 0; i < this.quarks.length; i++) this.quarks[i].freeze()

        super.freeze()
    }


    canBeCollapsedWithNext () : boolean {
        return this.refCount === 1 && this.reachCount === 0
    }


    destroy () {
        this.quarks     = undefined
        this.previous   = undefined
    }


    static new<T extends typeof Iteration> (this : T, props? : Partial<InstanceType<T>>) : InstanceType<T> {
        const instance = new this()

        Object.assign(instance, props)

        return instance as InstanceType<T>
    }
}
