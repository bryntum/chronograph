import { Base } from "../class/Mixin.js"
import { NOT_VISITED, OnCycleAction, VISITED_TOPOLOGICALLY, WalkSource } from "../graph/WalkDepth.js"
import { LeveledQueue } from "../util/LeveledQueue.js"
import { Identifier } from "./Identifier.js"
import { Quark } from "./Quark.js"
import { Revision } from "./Revision.js"


export type WalkStep = { from : Identifier | typeof WalkSource, to : Identifier }

//---------------------------------------------------------------------------------------------------------------------
export class TransactionWalkDepth extends Base {
    visited         : Map<Identifier, Quark>    = new Map()

    baseRevision    : Revision                  = undefined

    pushTo          : LeveledQueue<Quark>       = undefined

    toVisit         : WalkStep[]                = []

    currentEpoch    : number                    = 0


    startFrom (sourceNodes : Identifier[]) {
        this.continueFrom(sourceNodes)
    }


    continueFrom (sourceNodes : Identifier[]) {
        this.toVisit.push.apply(this.toVisit, sourceNodes.map(node => { return { from : WalkSource, to : node } }))

        this.walkDepth()
    }


    startNewEpoch () {
        if (this.toVisit) throw new Error("Can not start new walk epoch in the middle of the walk")

        this.currentEpoch++
    }


    // setVisitedInfo (identifier : Identifier, visitedAt : number, info : Quark) : VisitInfo {
    //     if (!info) {
    //         info      = identifier.newQuark(this.baseRevision.createdAt)
    //
    //         this.visited.set(identifier, info)
    //     }
    //
    //     info.visitedAt    = visitedAt
    //
    //     if (info.visitEpoch !== this.currentEpoch) info.resetToEpoch(this.currentEpoch)
    //
    //     return info
    // }



    onTopologicalNode (identifier : Identifier, visitInfo : Quark) {
        if (!identifier.lazy) this.pushTo.push(visitInfo)
    }


    onCycle (node : Identifier, stack : WalkStep[]) : OnCycleAction {
        return OnCycleAction.Resume
    }


    // doCollectNext (from : Identifier, identifier : Identifier, toVisit : WalkStep[]) {
    //     let entry : Quark   = this.visited.get(identifier)
    //
    //     if (!entry) {
    //         entry           = identifier.newQuark(this.baseRevision.createdAt)
    //
    //         this.visited.set(identifier, entry)
    //     }
    //
    //     if (entry.visitEpoch < this.currentEpoch) entry.resetToEpoch(this.currentEpoch)
    //
    //     entry.edgesFlow++
    //
    //     toVisit.push({ node : identifier, from : from, label : undefined })
    // }


    collectNext (from : Identifier, toVisit : WalkStep[], visitInfo : Quark) {
        const latestEntry       = this.baseRevision.getLatestEntryFor(from)

        if (latestEntry) {
            // since `collectNext` is called exactly once for every node, all quarks
            // will have the `previous` property populated
            visitInfo.previous      = latestEntry

            latestEntry.outgoingInTheFutureCb(this.baseRevision, outgoingEntry => {
                toVisit.push({ from : from, to : outgoingEntry.identifier })
            })
        }

        for (const outgoingIdentifier of visitInfo.getOutgoing().keys()) {
            toVisit.push({ from : from, to : outgoingIdentifier })
        }
    }


    onRepeatedVisit (node : Identifier, visitInfo : Quark) {
        visitInfo.edgesFlow++
    }


    onFirstVisitInEpoch (node : Identifier) : boolean {
        return true
    }


    walkDepth () {
        const visited               = this.visited
        const toVisit               = this.toVisit

        let depth

        while (depth = toVisit.length) {
            const node          = toVisit[ depth - 1 ].to

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
                // if we break here, we can re-enter the loop later
                if (this.onFirstVisitInEpoch(node) === false) break

                const lengthBefore  = toVisit.length

                if (!visitInfo) {
                    visitInfo               = node.newQuark(this.baseRevision.createdAt)

                    visitInfo.visitedAt     = depth
                    visitInfo.visitEpoch    = this.currentEpoch

                    visited.set(node, visitInfo)
                }

                this.collectNext(node, toVisit, visitInfo)

                if (visitInfo.visitEpoch < this.currentEpoch) {
                    visitInfo.resetToEpoch(this.currentEpoch)
                    visitInfo.visitedAt     = depth
                }

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


