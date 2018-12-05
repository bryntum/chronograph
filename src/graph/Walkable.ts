import {Base, Constructable, Mixin} from "../class/Mixin.js";


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


    abstract getNext (node) : Walkable[]
}



//---------------------------------------------------------------------------------------------------------------------
export const Walkable = <T extends Constructable<Base>>(base : T) => {

    abstract class Walkable extends base {

        /**
            POSSIBLE OPTIMIZATION (need to benchmark)
            instead of the separate map for visited data

              const visitedAt             = new Map<this, number>()

            store the number in the node itself (as non-enumerable symbol property)
        */
        walkDepth (context : WalkContext) {
            const visitedAt             = new Map<this, number>()
            const visitedTopologically  = new Set<this>()

            let toVisit : this[]        = [ this ]

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

                        toVisit.pop()
                        depth--
                    }
                } else {
                    visitedAt.set(node, depth)

                    context.onNode(node)

                    const next          = context.getNext(node)

                    if (next.length) {
                        toVisit.push.apply(toVisit, next)
                    } else {
                        toVisit.pop()

                        visitedTopologically.add(node)

                        // if there's no outgoing edges, node is at topological position
                        context.onTopologicalNode(node)
                    }
                }
            }
        }
    }

    return Walkable
}

export type Walkable = Mixin<typeof Walkable>


//---------------------------------------------------------------------------------------------------------------------
export class WalkFowardContext extends WalkContext {

    getNext (node : WalkableFoward) : WalkableFoward[] {
        return node.getOutgoing()
    }
}


//---------------------------------------------------------------------------------------------------------------------
export class WalkBackwardContext extends WalkContext {

    getNext (node : WalkableBackward) : WalkableBackward[] {
        return node.getIncoming()
    }
}


//---------------------------------------------------------------------------------------------------------------------
export const WalkableFoward = <T extends Constructable<Walkable>>(base : T) => {

    abstract class WalkableFoward extends base {
        abstract getOutgoing () : this[]
    }

    return WalkableFoward
}

export type WalkableFoward = Mixin<typeof WalkableFoward>



//---------------------------------------------------------------------------------------------------------------------
export const WalkableBackward = <T extends Constructable<Walkable>>(base : T) => {

    abstract class WalkableBackward extends base {
        abstract getIncoming () : this[]
    }

    return WalkableBackward
}

export type WalkableBackward = Mixin<typeof WalkableBackward>


//---------------------------------------------------------------------------------------------------------------------
export const MinimalWalkableForward     = WalkableFoward(Walkable(Base))

export const MinimalWalkableBackward    = WalkableBackward(Walkable(Base))
