import { Base } from "../class/Base.js"
import { NOT_VISITED, OnCycleAction, VISITED_TOPOLOGICALLY } from "../graph/WalkDepth.js"
import { LeveledQueue } from "../util/LeveledQueue.js"
import { Identifier, Levels } from "./Identifier.js"
import { Quark } from "./Quark.js"
import { Revision } from "./Revision.js"
import { Transaction } from "./Transaction.js"


/** A single step in the dependency walk, represented by an [[Identifier]]. */
export type WalkStep = Identifier

//---------------------------------------------------------------------------------------------------------------------
/**
 * Depth-first dependency graph walker used during [[Transaction]] propagation.
 *
 * When data is written to a graph, the transaction needs to determine which identifiers are
 * potentially affected and must be recalculated. This class performs that traversal by walking
 * outgoing dependency edges depth-first, creating new [[Quark]] entries for visited identifiers,
 * and pushing non-lazy, non-variable quarks into the calculation queue ([[pushTo]]).
 *
 * The walk uses an epoch counter to support multiple walk passes within the same transaction
 * (e.g., when a write effect triggers additional dependency invalidation).
 */
export class TransactionWalkDepth extends Base {
    /** Map of visited identifiers to their quarks. Shared with [[Transaction.entries]]. */
    visited         : Map<Identifier, Quark>    = new Map()

    /** The owning transaction. */
    transaction     : Transaction               = undefined

    /** The base revision used to look up previous quark entries and outgoing edges. */
    baseRevision    : Revision                  = undefined

    /** The [[LeveledQueue]] to push topologically-ordered quarks into for calculation. */
    pushTo          : LeveledQueue<Quark>       = undefined

    /** Stack of identifiers remaining to visit in the current depth-first walk. */
    toVisit         : WalkStep[]                = []

    /** Epoch counter incremented when a new walk pass begins. Prevents revisiting already-processed nodes. */
    currentEpoch    : number                    = 0


    /**
     * Begins a depth-first walk starting from the given source identifiers.
     *
     * @param sourceNodes The identifiers to start the walk from
     */
    startFrom (sourceNodes : Identifier[]) {
        this.continueFrom(sourceNodes)
    }


    /**
     * Continues the walk from additional source identifiers. Adds them to [[toVisit]]
     * and resumes the depth-first traversal.
     *
     * @param sourceNodes Additional identifiers to walk from
     */
    continueFrom (sourceNodes : Identifier[]) {
        this.toVisit.push.apply(this.toVisit, sourceNodes)

        this.walkDepth()
    }


    /**
     * Increments the epoch counter, allowing previously visited nodes to be revisited
     * in a new walk pass. Must not be called while a walk is in progress.
     */
    startNewEpoch () {
        if (this.toVisit.length) throw new Error("Can not start new walk epoch in the middle of the walk")

        this.currentEpoch++
    }


    /**
     * Called when a node reaches topological position (all its dependencies have been visited).
     * Pushes non-lazy, non-variable quarks into the calculation queue.
     */
    onTopologicalNode (identifier : Identifier, visitInfo : Quark) {
        if (!identifier.lazy && identifier.level !== Levels.UserInput) this.pushTo.push(visitInfo)
    }


    /** Called when a cycle is detected. Default behavior is to resume traversal. */
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


    /**
     * Collects outgoing dependencies of the given identifier and adds them to the visit stack.
     * Populates the quark's `previous` reference from the base revision.
     */
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


    /**
     * The core depth-first traversal loop. Processes the [[toVisit]] stack, visiting each identifier's
     * dependencies before the identifier itself (topological ordering). Handles cycle detection
     * and epoch-based revisitation.
     */
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


