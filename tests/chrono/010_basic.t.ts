import {MinimalRWAtom} from "../../src/chrono/Atom.js";
import {MinimalChronoMutationData, MinimalMutationData} from "../../src/chrono/Mutation.js";
import {ChronoGraphSnapshot, MinimalChronoGraphSnapshot} from "../../src/chronograph/Graph.js";
import {ChronoGraphNode, MinimalChronoGraphNode} from "../../src/chronograph/Node.js";

declare const StartTest : any

StartTest(t => {

    t.it('Minimal mutation (outside of graph)', t => {
        const atom1     = MinimalRWAtom.new({ value : 0 })
        const atom2     = MinimalRWAtom.new({ value : 1 })

        const result    = MinimalRWAtom.new()

        const mutation  = MinimalMutationData.new({
            input       : [ atom1, atom2 ],
            as          : [ result ],

            calculation : (v1, v2) => v1 + v2
        })

        mutation.runCalculation()

        t.is(result.get(), 1, "Correct result calculated")
    })


    t.it('Minimal reference mutation', t => {
        const node      = MinimalChronoGraphNode.new()

        t.is(node.hasValue(), false, 'No value initially provided')
        t.is(node.get(), undefined, 'No value initially provided')
        t.is(node.previous, undefined, 'Can track the old value')

        node.set(1)

        t.is(node.hasValue(), true, 'Can set value')
        t.is(node.get(), 1, 'Can set value')
        t.is(node.previous, undefined, 'Can track the old value')

        node.set(2)

        t.is(node.get(), 2, 'Can update value')
        t.is(node.previous.get(), 1, 'Can track the old value')

        node.set(3)

        t.is(node.get(), 3, 'Can update value')
        t.is(node.previous.get(), 2, 'Can track the old value')
        t.is(node.previous.previous.get(), 1, 'Can track the old value')
        t.is(node.previous.previous.previous, undefined, 'Can track the old value')
    })



    t.it('Minimal mutation in graph context', t => {
        const graph : ChronoGraphSnapshot   = MinimalChronoGraphSnapshot.new()

        const node1 : ChronoGraphNode       = graph.addNode(MinimalChronoGraphNode.new({ id : 1 }))
        const node2 : ChronoGraphNode       = graph.addNode(MinimalChronoGraphNode.new({ id : 2 }))

        const resultNode : ChronoGraphNode  = graph.addNode(MinimalChronoGraphNode.new({ id : 3 }))

        const mutation  = MinimalChronoMutationData.new({
            input       : [ node1, node2 ],
            as          : [ resultNode ],

            calculation : (v1, v2) => v1 + v2
        })

        graph.addMutation(mutation)

        node1.set(0)
        node2.set(1)

        debugger

        graph.propagate()

        t.is(resultNode.get(), 1, "Correct result calculated")

        node1.set(1)

        graph.propagate()

        t.is(resultNode.get(), 2, "Correct result calculated")

        node2.set(2)

        graph.propagate()

        t.is(resultNode.get(), 3, "Correct result calculated")
    })




})
