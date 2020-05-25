import { Base } from "../class/Base.js"

export enum OnCycleAction {
    Cancel  = "Cancel",
    Resume  = "Resume"
}

//---------------------------------------------------------------------------------------------------------------------
export const WalkSource = Symbol('WalkSource')


//---------------------------------------------------------------------------------------------------------------------
export type WalkStep<Walkable, Label = any> = { node : Walkable, from : Walkable | typeof WalkSource, label : Label }


export const NOT_VISITED                = -1
export const VISITED_TOPOLOGICALLY      = -2

export type VisitInfo = {
    visitEpoch              : number,
    visitedAt               : number
}


//---------------------------------------------------------------------------------------------------------------------
export class WalkContext<Walkable, Label = any> extends Base {
    visited         : Map<Walkable, VisitInfo>      = new Map()

    toVisit         : WalkStep<Walkable>[]          = []

    currentEpoch    : number                        = 0


    startFrom (sourceNodes : Walkable[]) {
        this.continueFrom(sourceNodes)
    }


    continueFrom (sourceNodes : Walkable[]) {
        this.toVisit.push.apply(this.toVisit, sourceNodes.map(node => { return { node : node, from : WalkSource, label : undefined } }))

        this.walkDepth()
    }


    onNode (node : Walkable, walkStep : WalkStep<Walkable, Label>) : boolean | void {
    }


    onTopologicalNode (node : Walkable) {
    }


    onCycle (node : Walkable, stack : WalkStep<Walkable>[]) : OnCycleAction {
        return OnCycleAction.Cancel
    }


    forEachNext (node : Walkable, func : (label : Label, node : Walkable) => any) {
        throw new Error("Abstract method called")
    }


    collectNext (node : Walkable, toVisit : WalkStep<Walkable>[], visitInfo : VisitInfo) {
        throw new Error("Abstract method called")
    }


    getVisitedInfo (node : Walkable) : VisitInfo {
        return this.visited.get(node)
    }


    setVisitedInfo (node : Walkable, visitedAt : number, info : VisitInfo) : VisitInfo {
        if (!info) {
            info                        = { visitedAt, visitEpoch : this.currentEpoch }
            this.visited.set(node, info)
        } else {
            info.visitedAt              = visitedAt
            info.visitEpoch             = this.currentEpoch
        }

        return info
    }


    walkDepth () {
        const visited               = this.visited
        const toVisit               = this.toVisit

        let depth

        while (depth = toVisit.length) {
            const node              = toVisit[ depth - 1 ].node

            const visitedInfo       = this.getVisitedInfo(node)

            // this supports the "ahead-of-time" creation of the "visited" entries, which actually lead to improved benchmarks,
            // so it might be a default
            if (visitedInfo && visitedInfo.visitedAt === VISITED_TOPOLOGICALLY && visitedInfo.visitEpoch === this.currentEpoch) {
                toVisit.pop()
                continue
            }

            if (visitedInfo && visitedInfo.visitEpoch === this.currentEpoch && visitedInfo.visitedAt !== NOT_VISITED) {
                // it is valid to find itself "visited", but only if visited at the current depth
                // (which indicates stack unwinding)
                // if the node has been visited at earlier depth - its a cycle
                if (visitedInfo.visitedAt < depth) {
                    // ONLY resume if explicitly returned `Resume`, cancel in all other cases (undefined, etc)
                    if (this.onCycle(node, toVisit) !== OnCycleAction.Resume) break
                } else {
                    visitedInfo.visitedAt = VISITED_TOPOLOGICALLY

                    this.onTopologicalNode(node)
                }

                toVisit.pop()
            } else {
                // if we break here, we can re-enter the loop later
                if (this.onNode(node, toVisit[ depth - 1 ]) === false) break

                // first entry to the node
                const visitedInfo2      = this.setVisitedInfo(node, depth, visitedInfo)

                const lengthBefore      = toVisit.length

                this.collectNext(node, toVisit, visitedInfo2)

                // if there's no outgoing edges, node is at topological position
                // it would be enough to just continue the `while` loop and the `onTopologicalNode`
                // would happen on next iteration, but with this "inlining" we save one call to `visited.get()`
                // at the cost of length comparison
                if (toVisit.length === lengthBefore) {
                    visitedInfo2.visitedAt = VISITED_TOPOLOGICALLY

                    this.onTopologicalNode(node)

                    toVisit.pop()
                }
            }
        }
    }
}


//---------------------------------------------------------------------------------------------------------------------
export function cycleInfo<Walkable, Label = any> (stack : WalkStep<Walkable, Label>[]) : Walkable[] {
    const length                = stack.length

    if (length === 0) return []

    const cycleSource           = stack[ length - 1 ].node

    const cycle : Walkable[]    = [ cycleSource ]

    let current                 = length - 1
    let cursor                  = current

    while (current >= 0 && stack[ current ].from !== cycleSource) {
        // going backward in steps, skipping the nodes with identical `from`
        while (current >= 0 && stack[ current ].from === stack[ cursor ].from) current--

        if (current >= 0) {
            // the first node with different `from` will be part of the cycle path
            cycle.push(stack[ current ].node)

            cursor              = current
        }
    }

    // no cycle
    if (current < 0) return []

    cycle.push(cycleSource)

    return cycle.reverse()
}

