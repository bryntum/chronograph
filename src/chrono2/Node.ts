import { MIN_SMI } from "../util/Helpers.js"
import { compact, Uniqable } from "../util/Uniqable.js"

let revisionId = Number.MIN_SAFE_INTEGER

export const getRevision = () : number => ++revisionId


export type Edge = Node | number

//---------------------------------------------------------------------------------------------------------------------
export class Node implements Uniqable {
    uniqable            : number        = Number.MIN_SAFE_INTEGER

    // initially no revision, revision is acquired with the value
    revision            : number        = Number.MIN_SAFE_INTEGER

    $incoming           : Node[]        = undefined
    $outgoing           : Edge[]        = undefined

    outgoingCompacted   : boolean       = false

    // TODO we can also just check the last element in the `$outgoing`, need to benchmark
    lastOutgoingTo          : Node          = undefined


    getIncoming () : this[ '$incoming' ] {
        if (this.$incoming !== undefined) return this.$incoming

        return this.$incoming = []
    }


    // getOutgoing () : this[ '$outgoing' ] {
    //     if (this.$outgoing !== undefined) {
    //         if (!this.outgoingCompacted) {
    //             compact(this.$outgoing)
    //
    //             this.outgoingCompacted = true
    //         }
    //
    //         return this.$outgoing
    //     } else
    //         return this.$outgoing = []
    // }


    clearOutgoing () {
        // seems to be faster to just assign `undefined` instead of setting length to 0
        this.$outgoing          = undefined
        this.outgoingCompacted  = false
        this.lastOutgoingTo     = undefined
    }


    addIncoming (from : Node, calledFromPartner : boolean = false) {
        this.getIncoming().push(from)
        if (!calledFromPartner) from.addOutgoing(this, true)
    }


    addOutgoing (to : Node, calledFromPartner : boolean = false) {
        const toRevision            = to.revision

        if (this.lastOutgoingTo === to) {
            this.$outgoing[ this.$outgoing.length - 1 ] = to.revision

            return
        }

        this.lastOutgoingTo         = to

        this.outgoingCompacted  = false

        if (this.$outgoing === undefined) this.$outgoing = []

        this.$outgoing.push(to, toRevision)
        if (!calledFromPartner) to.addIncoming(this, true)
    }
}

