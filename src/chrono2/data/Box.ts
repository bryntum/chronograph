import { globalContext } from "../GlobalContext.js"
import { Atom, AtomState, Quark } from "../Quark.js"


//---------------------------------------------------------------------------------------------------------------------
export class BoxImmutable extends Quark {
    value               : unknown                 = undefined

    constructor (owner : Atom) {
        super()

        this.owner      = owner
    }


    hasValue () : boolean {
        return this.read() !== undefined
    }


    hasOwnValue () : boolean {
        return this.value !== undefined
    }


    read () : unknown {
        let box : this = this

        while (box) {
            if (box.value !== undefined) return box.value

            box     = box.previous
        }

        return null
    }


    write (value : unknown) {
        if (this.frozen) throw new Error("Can't write to frozen box")

        this.value = value
    }
}


//---------------------------------------------------------------------------------------------------------------------
// TODO Box should extend both Atom & BoxImmutable as CombinedOwnerAndImmutable
export class Box extends Atom {
    immutable       : BoxImmutable  = new BoxImmutable(this)


    immutableForWrite () : this[ 'immutable' ] {
        if (this.immutable.frozen) this.setCurrent(this.immutable.createNext())

        return this.immutable
    }


    read () : any {
        if (this.graph) this.actualize()

        if (globalContext.activeQuark) this.immutableForWrite().addOutgoing(globalContext.activeQuark)

        return this.immutable.read()
    }


    write (value : unknown) {
        if (this.graph) this.actualize()

        if (value === undefined) value = null

        if (value === this.immutable.read()) return

        this.propagatePossiblyStale()

        this.immutableForWrite().write(value)
        this.state  = AtomState.UpToDate

        this.propagateStale()
    }
}

// export class InvalidatingBoxImmutable extends BoxImmutable {
// }
//
// export class InvalidatingBox extends Box {
//     read () : any {
//         if (globalContext.activeQuark) globalContext.activeQuark.owner.state = AtomState.Stale
//     }
// }
//
// export const invalidatingBox            = new InvalidatingBox()
// export const invalidatingBoxImmutable   = new InvalidatingBoxImmutable(invalidatingBox)
