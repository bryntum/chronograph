import { Base } from "../class/BetterMixin.js";
import { NOT_VISITED, OnCycleAction, WalkContext } from "../graph/WalkDepth.js";
//---------------------------------------------------------------------------------------------------------------------
export class ComputationCycle extends Base {
    toString() {
        return this.cycle.map(identifier => {
            return identifier.name;
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
        }).join('\n');
    }
}
//---------------------------------------------------------------------------------------------------------------------
export class TransactionCycleDetectionWalkContext extends WalkContext {
    constructor() {
        // baseRevision    : Revision                  = undefined
        super(...arguments);
        this.transaction = undefined;
    }
    onCycle(node, stack) {
        return OnCycleAction.Cancel;
    }
    doCollectNext(from, to, toVisit) {
        let visit = this.visited.get(to);
        if (!visit) {
            visit = { visitedAt: NOT_VISITED, visitEpoch: this.currentEpoch };
            this.visited.set(to, visit);
        }
        toVisit.push({ node: to, from, label: undefined });
    }
    collectNext(from, toVisit) {
        const latestEntry = this.transaction.getLatestEntryFor(from);
        if (latestEntry) {
            latestEntry.outgoingInTheFutureTransactionCb(this.transaction, outgoingEntry => {
                this.doCollectNext(from, outgoingEntry.identifier, toVisit);
            });
        }
        // for (const outgoingIdentifier of visitInfo.getOutgoing().keys()) {
        //     this.doCollectNext(from, outgoingIdentifier, toVisit)
        // }
    }
}
