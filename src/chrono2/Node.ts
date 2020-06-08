import { AnyConstructor, Mixin } from "../class/Mixin.js"
import { MIN_SMI } from "../util/Helpers.js"
import { compact, Uniqable } from "../util/Uniqable.js"

//---------------------------------------------------------------------------------------------------------------------
export class Node extends Mixin(
    [],
    (base : AnyConstructor) =>

    class Node extends base implements Uniqable {
        uniqable            : number        = MIN_SMI

        $incoming           : Node[]        = undefined
        $outgoing           : Node[]        = undefined

        outgoingCompacted   : boolean       = false

        lastAddedTo         : Node          = undefined


        getIncoming () : this[ '$incoming' ] {
            if (this.$incoming !== undefined) return this.$incoming

            return this.$incoming = []
        }


        getOutgoing () : this[ '$outgoing' ] {
            if (this.$outgoing !== undefined) {
                if (!this.outgoingCompacted) {
                    compact(this.$outgoing)

                    this.outgoingCompacted = true
                }

                return this.$outgoing
            } else
                return this.$outgoing = []
        }


        clearOutgoing () {
            this.$outgoing          = undefined
            this.outgoingCompacted  = false
        }


        addIncoming (from : Node, calledFromPartner : boolean = false) {
            this.getIncoming().push(from)
            if (!calledFromPartner) from.addOutgoing(this, true)
        }


        addOutgoing (to : Node, calledFromPartner : boolean = false) {
            if (this.lastAddedTo === to) return

            this.lastAddedTo        = to

            this.outgoingCompacted  = false

            this.getOutgoing().push(to)
            if (!calledFromPartner) to.addIncoming(this, true)
        }
    }
){}

