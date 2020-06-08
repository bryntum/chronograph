import { AnyConstructor } from "../class/Mixin.js"
import { Immutable, Owner } from "./data/Immutable.js"
import { Node } from "./Node.js"


//---------------------------------------------------------------------------------------------------------------------
export enum AtomState {
    UpToDate        = 1,
    PossiblyStale   = 2,
    Stale           = 3
}

export class Quark extends Node implements Immutable {
    owner       : Atom          = undefined

    previous    : this          = undefined

    frozen      : boolean       = false


    freeze () {
        this.frozen = true
    }


    createNext () : this {
        this.freeze()

        const self      = this.constructor as AnyConstructor<this, typeof Immutable>
        const next      = new self()

        next.previous   = this
        next.owner      = this.owner

        return next
    }


    $incoming           : Quark[]
    $outgoing           : Quark[]
}


//---------------------------------------------------------------------------------------------------------------------
export class Atom extends Owner {
    immutable           : Quark         = undefined

    state               : AtomState     = AtomState.Stale


    propagatePossiblyStale () {
        const toVisit : Quark[]       = [ this.immutable ]

        while (toVisit.length) {
            const el        = toVisit.pop()

            if (el.owner.state === AtomState.UpToDate) {
                el.owner.state = AtomState.PossiblyStale

                if (el.$outgoing) {
                    const outgoing = el.getOutgoing()

                    for (let i = 0; i < outgoing.length; i++) {
                        if (outgoing[ i ].owner.state === AtomState.UpToDate) toVisit.push(outgoing[ i ])
                    }
                }
            }
        }
    }


    propagateStale () {
        if (this.immutable.$outgoing) {
            const outgoing = this.immutable.getOutgoing()

            for (let i = 0; i < outgoing.length; i++) {
                outgoing[ i ].owner.state = AtomState.Stale
            }

            this.immutable.clearOutgoing()
        }
    }
}
