import { Uniqable } from "../../util/Uniqable.js"

let revisionId = Number.MIN_SAFE_INTEGER

export const getRevision = () : number => ++revisionId


export type Edge = Node | number

let compactCounter  = 500
let compactAmount   = 500

export const setCompactCounter = (value : number) => compactCounter = value
export const setCompactAmount = (value : number) => compactAmount = value


//---------------------------------------------------------------------------------------------------------------------
export class Node implements Uniqable {
    uniqable            : number        = Number.MIN_SAFE_INTEGER

    // initially no revision, revision is acquired with the value
    revision            : number        = Number.MIN_SAFE_INTEGER

    $incoming           : Node[]        = undefined
    $outgoing           : Node[]        = undefined
    $outgoingRev        : number[]      = undefined

    // outgoingCompacted   : boolean       = false

    addCounter          : number        = 0

    // TODO we can also just check the last element in the `$outgoing`, need to benchmark
    lastOutgoingTo      : Node          = undefined


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
        this.$outgoingRev       = undefined
        // this.outgoingCompacted  = false
        this.addCounter         = 0
        this.lastOutgoingTo     = undefined
    }


    addIncoming (from : Node, calledFromPartner : boolean = false) {
        this.getIncoming().push(from)
        if (!calledFromPartner) from.addOutgoing(this, true)
    }


    compactOutgoing (startFrom : number) {

    }


    addOutgoing (to : Node, calledFromPartner : boolean = false) {
        const toRevision            = to.revision

        if (this.lastOutgoingTo === to) {
            this.$outgoingRev[ this.$outgoingRev.length - 1 ] = toRevision

            return
        }

        if (this.$outgoing === undefined) {
            this.$outgoing      = []
            this.$outgoingRev   = []
        }

        // TODO: figure out if these magick numbers
        // can be tweaked, perhaps dynamically
        // like - measure the length before/after compact
        // adjust magick number based on results
        this.addCounter = (this.addCounter + 1) % compactCounter

        if (this.addCounter === 0) {
            // idea is - we compact what've added (500),
            // plus some more?? (250)
            // TODO perform a full compact once every X compacts?
            this.compactOutgoing(this.$outgoing.length - compactAmount)
        }

        this.lastOutgoingTo         = to

        // this.outgoingCompacted  = false

        this.$outgoing.push(to)
        this.$outgoingRev.push(toRevision)
        if (!calledFromPartner) to.addIncoming(this, true)
    }
}

