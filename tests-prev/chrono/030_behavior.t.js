import { MinimalChronoAtom } from "../../src/chrono/Atom.js";
import { MinimalChronoGraph } from "../../src/chrono/Graph.js";
StartTest(t => {
    t.it('Behavior depending from data', async (t) => {
        const graph = MinimalChronoGraph.new();
        const box0 = graph.addNode(MinimalChronoAtom.new());
        const box1 = graph.addNode(MinimalChronoAtom.new());
        const box2 = graph.addNode(MinimalChronoAtom.new());
        const box3 = graph.addNode(MinimalChronoAtom.new({
            calculation: function* () {
                if ((yield box0) === 'sum') {
                    return (yield box1) + (yield box2);
                }
                else {
                    return (yield box1) * (yield box2);
                }
            }
        }));
        box0.put('sum');
        box1.put(0);
        box2.put(1);
        await graph.propagate();
        t.is(box3.get(), 1, "Correct result calculated");
        await box1.set(1);
        t.is(box3.get(), 2, "Correct result calculated");
        await box0.set('mul');
        t.is(box3.get(), 1, "Correct result calculated after behavior change");
        box1.put(2);
        box2.put(2);
        await graph.propagate();
        t.is(box3.get(), 4, "Correct result calculated after behavior change");
    });
});
