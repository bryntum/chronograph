import { MinimalChronoAtom } from "../../src/chrono/Atom.js";
import { MinimalChronoGraph, PropagationResult } from "../../src/chrono/Graph.js";
StartTest(t => {
    t.it("It should be possible to dry run graph propagation", async (t) => {
        const graph = MinimalChronoGraph.new();
        let a1, a2, a3;
        a1 = MinimalChronoAtom.new({
            calculation: function* (proposeValue) {
                return 1;
            }
        });
        a2 = MinimalChronoAtom.new({
            calculation: function* (proposedValue) {
                return 2;
            }
        });
        a3 = MinimalChronoAtom.new({
            calculation: function* (proposedValue) {
                return (yield a1) + (yield a2);
            }
        });
        let a3value = undefined;
        let result = await graph.tryPropagateWithNodes(null, [a1, a2, a3], () => {
            a3value = a3.get();
        });
        t.is(graph.getNodes().size, 0, "No nodes left in graph after propagation try");
        t.is(result, PropagationResult.Completed, "Propagation result is Completed");
        t.is(a3.get(), undefined, "Consistent a3 value is undefined");
        t.is(a3value, 3, "Hatched a3 value is correct");
    });
    t.it("Dry run shouldn't affect nodes which are already in the graph", async (t) => {
        const graph = MinimalChronoGraph.new();
        let a1, a2, a3;
        a1 = MinimalChronoAtom.new({
            calculation: function* (proposeValue) {
                return 1;
            }
        });
        graph.addNode(a1);
        a2 = MinimalChronoAtom.new({
            calculation: function* (proposedValue) {
                return 2;
            }
        });
        graph.addNode(a2);
        a3 = MinimalChronoAtom.new({
            calculation: function* (proposedValue) {
                return (yield a1) + (yield a2);
            }
        });
        let a3value = undefined;
        let result = await graph.tryPropagateWithNodes(null, [a1, a2, a3], () => {
            a3value = a3.get();
        });
        t.is(graph.getNodes().size, 2, "Existing graph nodes are not affected");
        t.is(a1.graph, graph, "A1 left in the graph");
        t.is(a2.graph, graph, "A2 left in the graph");
        t.is(result, PropagationResult.Completed, "Propagation result is Completed");
        t.is(a3.get(), undefined, "Consistent a3 value is undefined");
        t.is(a3value, 3, "Hatched a3 value is correct");
        t.isNot(a3.graph, graph, "A3 is not in the graph");
    });
});
