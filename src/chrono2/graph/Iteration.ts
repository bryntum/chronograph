import { Transaction } from "./Transaction.js"
import { Immutable } from "../data/Immutable.js"
import { Quark } from "../atom/Quark.js"

let revisionIdSource = Number.MIN_SAFE_INTEGER

//----------------------------------------------------------------------------------------------------------------------
export class Iteration extends Immutable {
    owner           : Transaction

    quarks          : Quark[] = []

    revision        : Revision = revisionIdSource++

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
        for (let i = 0; i < this.quarks.length; i++) this.quarks[i].freeze()

        super.freeze()
    }


    static new<T extends typeof Iteration> (this : T, props? : Partial<InstanceType<T>>) : InstanceType<T> {
        const instance = new this()

        Object.assign(instance, props)

        return instance as InstanceType<T>
    }
}

//----------------------------------------------------------------------------------------------------------------------
export type Revision = number
