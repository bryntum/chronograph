import { Base } from "../class/Base.js"
import { AnyConstructor } from "../class/Mixin.js"
import { ChronoReference } from "../chrono2/atom/Identifiable.js"
import { Quark } from "../chrono2/atom/Quark.js"
import { ChronoGraph } from "../chrono2/graph/Graph.js"

//----------------------------------------------------------------------------------------------------------------------
export class GarbageCollector extends Base {
    historySource           : Map<ChronoReference, Quark>   = new Map()

    usedBy                  : Set<ChronoGraph>              = new Set()


    clone (graph : ChronoGraph) : this {
        const cls       = this.constructor as AnyConstructor<this, typeof GarbageCollector>

        const clone     = new cls()

        clone.historySource = new Map(Array.from(this.historySource).map(entry => {
            entry[ 1 ]  = entry[ 1 ].clone()

            return entry
        }))

        clone.usedBy    = new Set([ graph ])

        this.usedBy.delete(graph)

        return clone
    }
}
