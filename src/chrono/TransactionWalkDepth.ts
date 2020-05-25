import { Base } from "../class/Base.js"
import { NOT_VISITED, OnCycleAction, VISITED_TOPOLOGICALLY } from "../graph/WalkDepth.js"
import { LeveledQueue } from "../util/LeveledQueue.js"
import { Identifier, Levels } from "./Identifier.js"
import { Quark } from "./Quark.js"
import { Revision } from "./Revision.js"
import { Transaction } from "./Transaction.js"


export type WalkStep = Identifier

//---------------------------------------------------------------------------------------------------------------------
export class TransactionWalkDepth extends Base {
    visited         : Map<Identifier, Quark>    = new Map()

    transaction     : Transaction               = undefined
    baseRevision    : Revision                  = undefined

    pushTo          : LeveledQueue<Quark>       = undefined

    toVisit         : WalkStep[]                = []

    currentEpoch    : number                    = 0


    startFrom (sourceNodes : Identifier[]) {
        this.continueFrom(sourceNodes)
    }


    continueFrom (sourceNodes : Identifier[]) {
        this.toVisit.push.apply(this.toVisit, sourceNodes)

        this.walkDepth()
    }


    startNewEpoch () {
        if (this.toVisit.length) throw new Error("Can not start new walk epoch in the middle of the walk")

        this.currentEpoch++
    }


    onTopologicalNode (identifier : Identifier, visitInfo : Quark) {
        if (!identifier.lazy && identifier.level !== Levels.UserInput) this.pushTo.push(visitInfo)
    }


    onCycle (node : Identifier, stack : WalkStep[]) : OnCycleAction {
        return OnCycleAction.Resume
    }


    // it is more efficient (=faster) to create new quarks for yet unvisited identifiers
    // in batches, using this method, instead of in normal flow in the `walkDepth` method
    // this is probably because of the CPU context switch between the `this.visited` and `this.baseRevision.getLatestEntryFor`
    doCollectNext (from : Identifier, to : Identifier, toVisit : WalkStep[]) {
        let quark : Quark   = this.visited.get(to)

        if (!quark) {
            quark               = to.newQuark(this.baseRevision)

            quark.visitEpoch    = this.currentEpoch

            this.visited.set(to, quark)
        }

        toVisit.push(to)
    }


    collectNext (from : Identifier, toVisit : WalkStep[], visitInfo : Quark) {
        const latestEntry       = this.baseRevision.getLatestEntryFor(from)

        if (latestEntry) {
            // since `collectNext` is called exactly once for every node, all quarks
            // will have the `previous` property populated
            visitInfo.previous      = latestEntry

            latestEntry.outgoingInTheFutureAndPastTransactionCb(this.transaction, outgoingEntry => {
                this.doCollectNext(from, outgoingEntry.identifier, toVisit)
            })
        }

        for (const outgoingIdentifier of visitInfo.getOutgoing().keys()) {
            this.doCollectNext(from, outgoingIdentifier, toVisit)
        }

        if (visitInfo.$outgoingPast !== undefined)
            for (const outgoingIdentifier of visitInfo.getOutgoingPast().keys()) {
                this.doCollectNext(from, outgoingIdentifier, toVisit)
            }
    }


    walkDepth () {
        const visited               = this.visited
        const toVisit               = this.toVisit

        let depth

        while (depth = toVisit.length) {
            const node          = toVisit[ depth - 1 ]

            let visitInfo       = visited.get(node)

            if (visitInfo && visitInfo.visitedAt === VISITED_TOPOLOGICALLY && visitInfo.visitEpoch === this.currentEpoch) {
                visitInfo.edgesFlow++

                toVisit.pop()
                continue
            }

            if (visitInfo && visitInfo.visitEpoch === this.currentEpoch && visitInfo.visitedAt !== NOT_VISITED) {
                // it is valid to find itself "visited", but only if visited at the current depth
                // (which indicates stack unwinding)
                // if the node has been visited at earlier depth - its a cycle
                if (visitInfo.visitedAt < depth) {
                    // ONLY resume if explicitly returned `Resume`, cancel in all other cases (undefined, etc)
                    if (this.onCycle(node, toVisit) !== OnCycleAction.Resume) break

                    visitInfo.edgesFlow++
                } else {
                    visitInfo.visitedAt = VISITED_TOPOLOGICALLY

                    this.onTopologicalNode(node, visitInfo)
                }

                toVisit.pop()
            } else {
                const lengthBefore  = toVisit.length

                if (!visitInfo) {
                    visitInfo               = node.newQuark(this.baseRevision)

                    visitInfo.visitEpoch    = this.currentEpoch

                    visited.set(node, visitInfo)
                }

                this.collectNext(node, toVisit, visitInfo)

                if (visitInfo.visitEpoch < this.currentEpoch) {
                    visitInfo.resetToEpoch(this.currentEpoch)
                }

                visitInfo.visitedAt     = depth
                visitInfo.edgesFlow++

                // if there's no outgoing edges, node is at topological position
                // it would be enough to just continue the `while` loop and the `onTopologicalNode`
                // would happen on next iteration, but with this "inlining" we save one call to `visited.get()`
                // at the cost of length comparison
                if (toVisit.length === lengthBefore) {
                    visitInfo.visitedAt = VISITED_TOPOLOGICALLY

                    this.onTopologicalNode(node, visitInfo)

                    toVisit.pop()
                }
            }
        }
    }
}


