import { Base } from "../class/BetterMixin.js"
import { NOT_VISITED, OnCycleAction, VisitInfo, WalkContext, WalkStep } from "../graph/WalkDepth.js"
import { Identifier } from "./Identifier.js"
import { Transaction } from "./Transaction.js"


//---------------------------------------------------------------------------------------------------------------------
export class ComputationCycle extends Base {
    cycle           : Identifier[]

    toString () : string {

        return this.cycle.map(identifier => {
            return identifier.name

            // //@ts-ignore
            // const sourcePoint : SourceLinePoint      = identifier.SOURCE_POINT
            //
            // if (!sourcePoint) return identifier.name
            //
            // const firstEntry       = sourcePoint.stackEntries[ 0 ]
            //
            // if (firstEntry) {
            //     return `${identifier}\n    yielded at ${firstEntry.sourceFile}:${firstEntry.sourceLine}:${firstEntry.sourceCharPos || ''}`
            // } else
            //     return identifier.name
        }).join('\n')
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class TransactionCycleDetectionWalkContext extends WalkContext<Identifier> {

    // baseRevision    : Revision                  = undefined

    transaction     : Transaction               = undefined


    onCycle (node : Identifier, stack : WalkStep<Identifier, any>[]) : OnCycleAction {
        return OnCycleAction.Cancel
    }


    doCollectNext (from : Identifier, to : Identifier, toVisit : WalkStep<Identifier>[]) {
        let visit : VisitInfo   = this.visited.get(to)

        if (!visit) {
            visit               = { visitedAt : NOT_VISITED, visitEpoch : this.currentEpoch }

            this.visited.set(to, visit)
        }

        toVisit.push({ node : to, from, label : undefined })
    }


    collectNext (from : Identifier, toVisit : WalkStep<Identifier>[]) {
        const latestEntry       = this.transaction.getLatestEntryFor(from)

        if (latestEntry) {
            latestEntry.outgoingInTheFutureTransactionCb(this.transaction, outgoingEntry => {
                this.doCollectNext(from, outgoingEntry.identifier, toVisit)
            })
        }

        // for (const outgoingIdentifier of visitInfo.getOutgoing().keys()) {
        //     this.doCollectNext(from, outgoingIdentifier, toVisit)
        // }
    }

}
