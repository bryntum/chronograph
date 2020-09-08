import { MIN_SMI } from "../../util/Helpers.js"
import { Uniqable } from "../../util/Uniqable.js"

//---------------------------------------------------------------------------------------------------------------------
let revisionId : number = MIN_SMI

export const getNextRevision    = () : number => ++revisionId
export const getCurrentRevision = () : number => revisionId


//---------------------------------------------------------------------------------------------------------------------
let compactCounter  = 500
let compactAmount   = 500 // 1000

export const setCompactCounter  = (value : number) => compactCounter = value
export const setCompactAmount   = (value : number) => compactAmount = value


//---------------------------------------------------------------------------------------------------------------------
export class Node implements Uniqable {
    uniqable            : number        = MIN_SMI

    // initially no revision, revision is acquired with the value
    revision            : number        = MIN_SMI

    $incoming           : Node[]        = undefined
    $incomingPast       : Node[]        = undefined

    $outgoing           : Node[]        = undefined
    $outgoingRev        : number[]      = undefined

    // outgoingCompacted   : boolean       = false

    addCounter          : number        = 0

    // TODO we can also just check the last element in the `$outgoing`, need to benchmark
    lastOutgoingTo      : Node          = undefined
    lastOutgoingToRev   : number        = MIN_SMI


    clearOutgoing () {
        // seems to be faster to just assign `undefined` instead of setting length to 0
        this.$outgoing          = undefined
        this.$outgoingRev       = undefined
        // this.outgoingCompacted  = false
        this.addCounter         = 0
        this.lastOutgoingTo     = undefined
        this.lastOutgoingToRev  = MIN_SMI
    }


    compactOutgoing (startFrom : number) {
    }


    addOutgoing (to : Node, isFromPast : boolean) {
        const toRevision            = to.revision

        if (this.lastOutgoingTo === to && this.lastOutgoingToRev === toRevision) {
            this.$outgoingRev[ this.$outgoingRev.length - 1 ] = toRevision

            return
        }

        this.lastOutgoingTo         = to
        this.lastOutgoingToRev      = toRevision

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
            // plus some more?? (500)
            // TODO perform a full compact once every X compacts?
            // TODO need to distinct the outgoings of the different "virtual" iterations
            // (the iterations that are immediately compacted - they correspond to the `revision`
            // and perform full compact every X iterations
            // this.compactOutgoing(0)
            this.compactOutgoing(this.$outgoing.length - compactAmount)
        }

        // this.outgoingCompacted  = false

        this.$outgoing.push(to)
        this.$outgoingRev.push(toRevision)

        if (isFromPast) {
            if (to.$incomingPast === undefined) to.$incomingPast = []

            to.$incomingPast.push(this)
        } else {
            if (to.$incoming === undefined) to.$incoming = []

            to.$incoming.push(this)
        }
    }
}

