import { AnyConstructor } from "../../class/Mixin.js"
import { getUniqable } from "../../util/Uniqable.js"
import { Quark } from "../atom/Quark.js"
import { Immutable } from "../data/Immutable.js"
import { Transaction } from "./Transaction.js"


//----------------------------------------------------------------------------------------------------------------------
export class Iteration extends Immutable {
    owner           : Transaction

    quarks          : Quark[]           = []

    // incremented by any owning graph, at any depth
    refCount        : number            = 0
    // incremented by any owning graph, at the depth of its `historyLimit`
    reachCount      : number            = 0


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


    mark (reachable : boolean) {
        this.refCount++

        if (reachable) this.reachCount++
    }


    unmark (reachable : boolean) {
        this.refCount--

        if (reachable) this.reachCount--
    }


    forEveryQuarkTill (stopAt : Iteration, onAtomOccurrence : (quark : Quark, first : boolean) => any) {
        let iteration           = this

        const uniqable          = getUniqable()

        while (true) {
            const quarks        = iteration.quarks

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


    freeze () {
        for (let i = 0; i < this.quarks.length; i++) this.quarks[i].freeze()

        super.freeze()
    }


    consume (another : Iteration) : Iteration {
        if (this.previous) throw new Error("Should be only called on last iteration")

        const target    = this.reachCount === 0 ? this : this.clone()

        another.forEveryQuarkTill(this, (quark, first) => {
            if (first) {
                target.addQuark(quark)

                quark.consumePreviousHistory()
            }
        })

        let iteration       = another

        const stopAt        = this

        while (iteration && iteration !== stopAt) {
            if (iteration.reachCount === 0) iteration.destroy()

            iteration      = iteration.previous
        }

        return target
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


//----------------------------------------------------------------------------------------------------------------------
export class IterationShreding extends Iteration {
    quarksShreding          : Map<number, Quark> = new Map()


    clone () : this {
        const clone             = super.clone()

        clone.quarksShreding    = new Map(this.quarksShreding)

        return clone
    }


    destroy () {
        super.destroy()

        this.quarksShreding     = undefined
    }


    addQuark (quark : Quark) {
        this.quarksShreding.set(quark.owner.id, quark)
    }
}

export const ZeroIteration = new IterationShreding()

// global reference
ZeroIteration.refCount++
