import { AnyConstructor, Base, Mixin } from "../class/Mixin.js";

export enum OnCycleAction {
    Cancel,
    Resume
}


//---------------------------------------------------------------------------------------------------------------------
export abstract class WalkContext extends Base {

    // onNode                  : (node : Walkable) => any
    // onTopologicalNode       : (node : Walkable) => any
    // onCycle                 : (node : Walkable) => any

    onNode (node : Walkable) {
    }


    onTopologicalNode (node : Walkable) {
    }


    onCycle (node : Walkable, stack : WalkStep[]) : OnCycleAction {
        return OnCycleAction.Cancel
    }


    abstract forEachNext (node : Walkable, func : (node : Walkable) => any)
}


//---------------------------------------------------------------------------------------------------------------------
export type WalkStep    = { node : Walkable, from : Walkable }


//---------------------------------------------------------------------------------------------------------------------
export const Walkable = <T extends AnyConstructor<Base>>(base : T) =>

class Walkable extends base {

    /**
        POSSIBLE OPTIMIZATION (need to benchmark)
        instead of the separate map for visited data

          const visitedAt             = new Map<this, number>()

        store the number in the node itself (as non-enumerable symbol property)
    */
    walkDepth (context : WalkContext) {
        // POSSIBLE OPTIMIZATION - have a single `visitedAt` map as Map<this, [ number, boolean ]> to
        // store the "visitedTopologically" flag
        const visitedAt             = new Map<Walkable, number>()
        const visitedTopologically  = new Set<Walkable>()

        const toVisit : WalkStep[]  = [ { node : this, from : this } ]

        let depth

        while (depth = toVisit.length) {
            const node              = toVisit[ depth - 1 ].node

            if (visitedTopologically.has(node)) {
                toVisit.pop()
                continue
            }

            const visitedAtDepth    = visitedAt.get(node)

            // node has been already visited
            if (visitedAtDepth != null) {

                // it is valid to find itself in the visited map, but only if visited at the current depth
                // (which indicates stack unwinding)
                // if the node has been visited at earlier depth - its a cycle
                if (visitedAtDepth < depth) {
                    if (context.onCycle(node, toVisit) !== OnCycleAction.Resume) break
                } else {
                    visitedTopologically.add(node)

                    // we've processed all outgoing edges from this node,
                    // now we can add it to topologically sorted results (if needed)
                    context.onTopologicalNode(node)
                }

                toVisit.pop()

            } else {
                visitedAt.set(node, depth)

                context.onNode(node)

                const lengthBefore  = toVisit.length

                context.forEachNext(node, nextNode => toVisit.push({ node : nextNode, from : node }))

                // no new nodes added
                if (toVisit.length === lengthBefore) {
                    visitedTopologically.add(node)

                    // if there's no outgoing edges, node is at topological position
                    context.onTopologicalNode(node)

                    toVisit.pop()
                }
            }
        }
    }
}

export type Walkable = Mixin<typeof Walkable>


export const cycleInfo = (stack : WalkStep[]) : Walkable[] => {
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


//---------------------------------------------------------------------------------------------------------------------
export class WalkForwardContext extends WalkContext {

    forEachNext (node : WalkableForward, func : (node : WalkableForward) => any) {
        node.forEachOutgoing(this, func)
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class WalkBackwardContext extends WalkContext {

    forEachNext (node : WalkableBackward, func : (node : WalkableBackward) => any) {
        node.forEachIncoming(this, func)
    }
}


//---------------------------------------------------------------------------------------------------------------------
export const WalkableForward = <T extends AnyConstructor<Walkable>>(base : T) => {

    abstract class WalkableForward extends base {
        abstract getOutgoing (context : WalkForwardContext) : WalkableForward[]

        forEachOutgoing (context : WalkForwardContext, func : (WalkableForward) => any) {
            this.getOutgoing(context).forEach(func)
        }
    }

    return WalkableForward
}

export type WalkableForward = Mixin<typeof WalkableForward>



//---------------------------------------------------------------------------------------------------------------------
export const WalkableBackward = <T extends AnyConstructor<Walkable>>(base : T) => {

    abstract class WalkableBackward extends base {
        abstract getIncoming (context : WalkBackwardContext) : WalkableBackward[]

        forEachIncoming(context : WalkBackwardContext, func : (WalkableBackward) => any) {
            this.getIncoming(context).forEach(func)
        }
    }

    return WalkableBackward
}

export type WalkableBackward = Mixin<typeof WalkableBackward>
