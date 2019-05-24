import { AnyConstructor, Base, Mixin } from "../class/Mixin.js"

export enum OnCycleAction {
    Cancel  = "Cancel",
    Resume  = "Resume"
}

//---------------------------------------------------------------------------------------------------------------------
export type WalkStep<Walkable>    = { node : Walkable, from : Walkable }


//---------------------------------------------------------------------------------------------------------------------
export class WalkContext<Walkable> extends Base {

    visited         : Map<Walkable, { visitedAt : number, visitedTopologically : boolean }>     = new Map()

    toVisit         : WalkStep<Walkable>[]


    onTopologicalNode (node : Walkable) {
    }


    onCycle (node : Walkable, stack : WalkStep<Walkable>[]) : OnCycleAction {
        return OnCycleAction.Cancel
    }


    forEachNext (node : Walkable, func : (node : Walkable) => any) {
        throw new Error("Abstract method called")
    }


    walkDepth () {
        const visited               = this.visited
        const toVisit               = this.toVisit

        let depth

        while (depth = toVisit.length) {
            const node              = toVisit[ depth - 1 ].node

            const visitedInfo       = visited.get(node)

            if (visitedInfo && visitedInfo.visitedTopologically) {
                toVisit.pop()
                continue
            }

            if (visitedInfo) {
                // repeating entry to the node
                const visitedAtDepth    = visitedInfo.visitedAt

                // it is valid to find itself "visited", but only if visited at the current depth
                // (which indicates stack unwinding)
                // if the node has been visited at earlier depth - its a cycle
                if (visitedAtDepth < depth) {
                    if (this.onCycle(node, toVisit) !== OnCycleAction.Resume) break
                } else {
                    visitedInfo.visitedTopologically = true

                    this.onTopologicalNode(node)
                }

                toVisit.pop()
            } else {
                // first entry to the node
                const visitedInfo       = { visitedAt : depth, visitedTopologically : false }

                visited.set(node, visitedInfo)

                const lengthBefore      = toVisit.length

                this.forEachNext(node, nextNode => toVisit.push({ node : nextNode, from : node }))

                // if there's no outgoing edges, node is at topological position
                // it would be enough to just continue the `while` loop and the `onTopologicalNode`
                // would happen on next iteration, but with this "inlining" we save one call to `visited.get()`
                // at the cost of length comparison
                if (toVisit.length === lengthBefore) {
                    visitedInfo.visitedTopologically = true

                    this.onTopologicalNode(node)

                    toVisit.pop()
                }
            }
        }
    }

}


//---------------------------------------------------------------------------------------------------------------------
export function cycleInfo<Walkable> (stack : WalkStep<Walkable>[]) : Walkable[] {
    const cycleSource           = stack[ stack.length - 1 ].node

    const cycle : Walkable[]    = [ cycleSource ]

    let pos                     = stack.length - 1
    let anotherNodePos          = stack.length - 1

    do {
        // going backward in steps, skipping the nodes with identical `from`
        for (; pos >= 0 && stack[ pos ].from === stack[ anotherNodePos ].from; pos--) ;

        if (pos >= 0) {
            // the first node with different `from` will be part of the cycle path
            cycle.push(stack[ pos ].node)

            anotherNodePos          = pos

            pos--
        }

    } while (pos >= 0 && stack[ pos ].node !== cycleSource)

    cycle.push(cycleSource)

    return cycle.reverse()
}

