import { MinimalChronoAtom } from "../../src/chrono/Atom.js";
import { MinimalChronoGraph } from "../../src/chrono/Graph.js";
StartTest(t => {
    t.xit('Observer should work', async (t) => {
        const graph = MinimalChronoGraph.new();
        const atom1 = graph.addNode(MinimalChronoAtom.new({ value: 0 }));
        const atom2 = graph.addNode(MinimalChronoAtom.new({ value: 1 }));
        const atom3 = graph.addNode(MinimalChronoAtom.new({
            calculation: function* (proposedValue) {
                return (yield atom1) + (yield atom2);
            }
        }));
        await graph.propagate();
        const log = [];
        const observer = graph.observe(function* () {
            const value3 = yield atom3;
            log.push(value3);
        });
        t.isDeeply(log, [1], "Correct observation history");
        await atom1.set(1);
        t.isDeeply(log, [1, 2], "Correct observation history");
        // @ts-ignore TODO remove
        observer.remove();
        await atom1.set(2);
        t.isDeeply(log, [1, 2], "Correct observation history");
    });
});
