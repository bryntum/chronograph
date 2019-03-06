import {MinimalChronoGraph} from "../../src/chrono/Graph.js";
import {MinimalChronoAtom} from "../../src/chrono/Atom.js";
import { GraphCycleDetectedEffect, EffectResolutionResult} from "../../src/chrono/Effect.js";
import { Node } from "../../src/graph/Node.js";

declare const StartTest : any

StartTest(t => {

    t.it("Cycle should be possible to detect outside via cycle detection effect", async t => {

        const graph = MinimalChronoGraph.new();

        let a1, a2;

        a1 = graph.addNode(MinimalChronoAtom.new({
            calculation : function * (proposeValue : number) {
                return yield a2;
            }
        }))

        a2 = graph.addNode(MinimalChronoAtom.new({
            calculation : function * (proposedValue : number) {
                return yield a1;
            }
        }))

        let gotCycle;

        await graph.propagate(async effect => {

            gotCycle = effect instanceof GraphCycleDetectedEffect

            if (gotCycle) {
                const cycle : Node[] = (effect as GraphCycleDetectedEffect).cycle
                t.ok(cycle.includes(a1), 'A1 atom is in cycle')
                t.ok(cycle.includes(a2), 'A2 atom is in cycle')
            }

            return  EffectResolutionResult.Cancel
        })

        t.ok(gotCycle, 'Cycle detected');
    })

    t.it("Cycle without effect resolution function should result in exception", async t => {

        const graph = MinimalChronoGraph.new();

        let a1, a2;

        a1 = graph.addNode(MinimalChronoAtom.new({
            calculation : function * (proposeValue : number) {
                return yield a2;
            }
        }))

        a2 = graph.addNode(MinimalChronoAtom.new({
            calculation : function * (proposedValue : number) {
                return yield a1;
            }
        }))

        try {
            await graph.propagate()
        }
        catch (e) {
            t.like(e.message, "cycle", "Got valid cycle exception")
        }
    })
})
