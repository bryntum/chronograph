import {Base, AnyConstructor, Mixin} from "../class/Mixin.js";


//---------------------------------------------------------------------------------------------------------------------
export abstract class WalkContext extends Base {

    // onNode                  : (node : Walkable) => any
    // onTopologicalNode       : (node : Walkable) => any
    // onCycle                 : (node : Walkable) => any

    onNode (node : Walkable) {
    }


    onTopologicalNode (node : Walkable) {
    }


    onCycle (node : Walkable) {
    }


    abstract getNext (node : Walkable) : Walkable[]


    abstract forEachNext (node : Walkable, func : (node : Walkable) => any)
}



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

        let toVisit : Walkable[]    = [ this ]

        let depth

        while (depth = toVisit.length) {
            let node                = toVisit[ depth - 1 ]

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
                if (visitedAtDepth < depth)
                    context.onCycle(node)
                else {
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

                context.forEachNext(node, node => toVisit.push(node))

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


//---------------------------------------------------------------------------------------------------------------------
export class WalkForwardContext extends WalkContext {

    getNext (node : WalkableForward) : WalkableForward[] {
        return node.getOutgoing(this)
    }

    forEachNext (node : WalkableForward, func : (node : WalkableForward) => any) {
        node.forEachOutgoing(this, func)
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class WalkBackwardContext extends WalkContext {

    getNext (node : WalkableBackward) : WalkableBackward[] {
        return node.getIncoming(this)
    }

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


//---------------------------------------------------------------------------------------------------------------------
export const MinimalWalkableForward     = WalkableForward(Walkable(Base))

export const MinimalWalkableBackward    = WalkableBackward(Walkable(Base))
