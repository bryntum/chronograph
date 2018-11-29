import {Base, Constructable, Mixin} from "../util/Mixin.js";

export type GraphWalkContext    = {
    direction               : 'forward' | 'backward'

    onNode                  : (node : GraphNode) => any,
    onTopologicalNode       : (node : GraphNode) => any
    onCycle                 : (node : GraphNode) => any
}



export const GraphNode = <T extends Constructable<Base>>(base : T) =>

class GraphNode extends base {
    fromEdges           : Set<this>         = new Set()
    toEdges             : Set<this>         = new Set()


    hasEdgeTo(toNode : this) : boolean {
        return this.fromEdges.has(toNode)
    }


    hasEdgeFrom(fromNode : this) : boolean {
        return this.toEdges.has(fromNode)
    }


    addEdgeTo(toNode : this) {
        this.fromEdges.add(toNode)
        toNode.toEdges.add(this)
    }


    addEdgeFrom(fromNode : this) {
        fromNode.fromEdges.add(this)
        this.toEdges.add(fromNode)
    }


    removeEdgeTo(toNode : this) {
        this.fromEdges.delete(toNode)
        toNode.toEdges.delete(this)
    }


    removeEdgeFrom(fromNode : this) {
        fromNode.fromEdges.delete(this)
        this.toEdges.delete(fromNode)
    }


    /**

     TODO generalize to arbitrary JSON, instead of GraphNode instance

     POSSIBLE OPTIMIZATION (need to benchmark)
     instead of the separate map for visited data
          const visitedAt             = new Map<this, number>()
     store the number in the node itself (as non-enumerable symbol property)

     */
    walkDepth (context : GraphWalkContext) {
        const visitedAt             = new Map<this, number>()

        let toVisit : this[]        = [ this ]

        let depth

        while (depth = toVisit.length) {
            let node                = toVisit[ depth - 1 ]

            const visitedAtDepth    = visitedAt.get(node)

            // node has been already visited
            if (visitedAtDepth != null) {

                // it is valid to find itself in the visited map, but only if visited at the current depth
                // (which indicates stack unwinding)
                // if the node has been visited at earlier depth - its a cycle
                if (visitedAtDepth < depth)
                    context.onCycle(node)
                else {
                    // we've processed all outgoing edges from this node,
                    // now we can add it to topologically sorted results (if needed)
                    context.onTopologicalNode(node)

                    toVisit.pop()
                    depth--
                }
            } else {
                visitedAt.set(node, depth)

                context.onNode(node)

                const next          = context.direction === 'forward' ? node.fromEdges : node.toEdges

                if (next.size) {
                    // TODO check that this iteration is performant (need to benchmark)
                    next.forEach(child => toVisit.push(child))
                } else {
                    toVisit.pop()

                    // if there's no outgoing edges, node is at topological position
                    context.onTopologicalNode(node)
                }
            }
        }
    }
}

export type GraphNode = Mixin<typeof GraphNode>





export const Graph = <T extends Constructable<Base>>(base : T) =>

class Graph extends base {
    nodes               : Set<GraphNode>    = new Set()


    hasNode (node : GraphNode) : boolean {
        return this.nodes.has(node)
    }


    addNodes (nodes : GraphNode[]) {
        nodes.forEach(node => this.addNode(node))
    }


    addNode (node : GraphNode) {
        // <debug>
        if (this.hasNode(node)) throw new Error("The node already exists")
        // </debug>

        this.nodes.add(node)
    }


    removeNodes (nodes : GraphNode[]) {
        nodes.forEach(node => this.removeNode(node))
    }


    removeNode (node : GraphNode) {
        // <debug>
        if (!this.hasNode(node)) throw new Error("The node does not exists")
        // </debug>

        this.nodes.delete(node)
    }


    hasEdge(fromNode : GraphNode, toNode : GraphNode) : boolean {
        return fromNode.hasEdgeTo(toNode)
    }


    addEdge(fromNode : GraphNode, toNode : GraphNode) {
        // <debug>
        if (fromNode.hasEdgeTo(toNode)) throw new Error("The edge between `from` and `to` nodes already exists")
        // </debug>

        fromNode.addEdgeTo(toNode)
    }


    removeEdge(fromNode : GraphNode, toNode : GraphNode) {
        // <debug>
        if (!fromNode.hasEdgeTo(toNode)) throw new Error("The edge between `from` and `to` nodes does not exists")
        // </debug>

        fromNode.removeEdgeTo(toNode)
    }

}

export type Graph = Mixin<typeof Graph>


export const ChronoGraphLayer = <T extends Constructable<Graph>>(base : T) =>

class ChronoGraphLayer extends base {

    previous            : ChronoGraphLayer

}

export type ChronoGraphLayer = Mixin<typeof ChronoGraphLayer>
