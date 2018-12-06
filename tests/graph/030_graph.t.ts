import {GraphBox, MinimalGraphBox} from "../../src/chronograph/Graph.js";

declare const StartTest : any

StartTest(t => {


    t.it('Minimal mutation in graph context', t => {
        const graph : GraphBox   = MinimalGraphBox.new()

        // const node1 : ChronoGraphNode       = graph.addNode(MinimalChronoGraphNode.new({ id : 1 }))
        // const node2 : ChronoGraphNode       = graph.addNode(MinimalChronoGraphNode.new({ id : 2 }))
        //
        // const resultNode : ChronoGraphNode  = graph.addNode(MinimalChronoGraphNode.new({ id : 3 }))
        //
        // const mutation  = MinimalChronoMutationNode.new({
        //     input       : [ node1, node2 ],
        //     as          : [ resultNode ],
        //
        //     calculation : (v1, v2) => v1 + v2
        // })
        //
        // graph.addMutation(mutation)
        //
        // node1.set(0)
        // node2.set(1)
        //
        // graph.propagate()
        //
        // graph.addMutation(mutation)
        //
        // t.is(resultNode.get(), 1, "Correct result calculated")
        //
        // node1.set(1)
        //
        // graph.propagate()
        //
        // graph.addMutation(mutation)
        //
        // t.is(resultNode.get(), 2, "Correct result calculated")
        // t.is(resultNode.previous.get(), 1, "Can track old value")
        //
        // node2.set(2)
        //
        // graph.propagate()
        //
        // t.is(resultNode.get(), 3, "Correct result calculated")
        // t.is(resultNode.previous.get(), 2, "Can track old value")
    })


    // t.iit('2 mutations in graph context', t => {
    //     debugger
    //
    //     const graph : ChronoGraphSnapshot   = MinimalChronoGraphSnapshot.new({ id : 'graph' })
    //
    //     const node1 : ChronoGraphNode       = graph.addNode(MinimalChronoGraphNode.new({ id : 'inp1' }))
    //     const node2 : ChronoGraphNode       = graph.addNode(MinimalChronoGraphNode.new({ id : 'inp2' }))
    //     const node1p2 : ChronoGraphNode     = graph.addNode(MinimalChronoGraphNode.new({ id : '1p2' }))
    //     const node3 : ChronoGraphNode       = graph.addNode(MinimalChronoGraphNode.new({ id : 'inp3' }))
    //
    //     const resultNode : ChronoGraphNode  = graph.addNode(MinimalChronoGraphNode.new({ id : 'res' }))
    //
    //     const mutation1 = MinimalChronoMutationNode.new({
    //         id          : 'mutation1',
    //
    //         input       : [ node1, node2 ],
    //         as          : [ node1p2 ],
    //
    //         calculation : (v1, v2) => {
    //             // debugger
    //             return v1 + v2
    //         }
    //     })
    //
    //     const mutation2 = MinimalChronoMutationNode.new({
    //         id          : 'mutation2',
    //
    //         input       : [ node1p2, node3 ],
    //         as          : [ resultNode ],
    //
    //         calculation : (v1, v2) => {
    //             // debugger
    //             return v1 + v2
    //         }
    //     })
    //
    //     graph.addMutation(mutation1)
    //     graph.addMutation(mutation2)
    //
    //     node1.set(0)
    //     node2.set(0)
    //     node3.set(1)
    //
    //     graph.propagate()
    //
    //     t.is(node1p2.get(), 0, "Correct result calculated")
    //     t.is(resultNode.get(), 1, "Correct result calculated")
    //
    //     // node1.set(1)
    //     //
    //     // graph.propagate()
    //     //
    //     // graph.addMutation(mutation)
    //     //
    //     // t.is(resultNode.get(), 2, "Correct result calculated")
    //     // t.is(resultNode.previous.get(), 1, "Can track old value")
    //     //
    //     // node2.set(2)
    //     //
    //     // graph.propagate()
    //     //
    //     // t.is(resultNode.get(), 3, "Correct result calculated")
    //     // t.is(resultNode.previous.get(), 2, "Can track old value")
    // })


})
