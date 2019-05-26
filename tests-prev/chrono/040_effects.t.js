import { MinimalChronoAtom } from "../../src/chrono/Atom.js";
import { CancelPropagationEffect, Effect, EffectResolutionResult, RestartPropagationEffect } from "../../src/chrono/Effect.js";
import { MinimalChronoGraph } from "../../src/chrono/Graph.js";
//---------------------------------------------------------------------------------------------------------------------
class WaitUntilResolvedEffect extends Effect {
}
//---------------------------------------------------------------------------------------------------------------------
export const WithEffect = (base) => class WithEffect extends base {
    constructor() {
        super(...arguments);
        this.waitUntilResolvedEffects = [];
    }
    async propagationCompletedHook() {
        await super.propagationCompletedHook();
        await this.waitForAllPromises();
    }
    async waitForAllPromises() {
        await Promise.all(this.waitUntilResolvedEffects.map(effect => effect.promise));
    }
    async onEffect(effect) {
        if (effect instanceof WaitUntilResolvedEffect) {
            this.waitUntilResolvedEffects.push(effect);
            return EffectResolutionResult.Resume;
        }
        else
            return super.onEffect(effect);
    }
};
StartTest(t => {
    t.it('Should allow to resume the propagation (default behaviour) with effects', async (t) => {
        const graph = WithEffect(MinimalChronoGraph).new();
        let resolved1 = false;
        let resolved2 = false;
        const box1 = graph.addNode(MinimalChronoAtom.new({
            calculation: function* (proposedValue) {
                yield WaitUntilResolvedEffect.new({
                    promise: new Promise((resolve, reject) => {
                        setTimeout(() => {
                            resolved1 = true;
                            resolve();
                        }, 10);
                    })
                });
                return (proposedValue !== undefined ? proposedValue : this.value) + 1;
            }
        }));
        const box2 = graph.addNode(MinimalChronoAtom.new({
            calculation: function* (proposedValue) {
                yield WaitUntilResolvedEffect.new({
                    promise: new Promise((resolve, reject) => {
                        setTimeout(() => {
                            resolved2 = true;
                            resolve();
                        }, 100);
                    })
                });
                return (proposedValue !== undefined ? proposedValue : this.value) + (yield box1);
            }
        }));
        box1.put(1);
        box2.put(1);
        await graph.propagate();
        t.ok(resolved1, "Promise has been resolved after propagate");
        t.ok(resolved2, "Promise has been resolved after propagate");
        t.is(box1.get(), 2, "Correct result calculated");
        t.is(box2.get(), 3, "Correct result calculated");
    });
    t.it('Should allow to wait until the propagation completes', async (t) => {
        const graph = WithEffect(MinimalChronoGraph).new();
        let resolved1 = false;
        const box1 = graph.addNode(MinimalChronoAtom.new({
            calculation: function* (proposedValue) {
                yield WaitUntilResolvedEffect.new({
                    promise: new Promise((resolve, reject) => {
                        setTimeout(() => {
                            resolved1 = true;
                            resolve();
                        }, 10);
                    })
                });
                return proposedValue;
            }
        }));
        box1.put(1);
        graph.propagate();
        await graph.waitForPropagateCompleted();
        t.ok(resolved1, "Promise has been resolved after propagate");
        t.is(box1.get(), 1, "Correct result calculated");
    });
    t.it('Should allow to cancel the propagation', async (t) => {
        const graph = MinimalChronoGraph.new();
        const box1 = graph.addNode(MinimalChronoAtom.new({
            calculation: function* (proposedValue) {
                if (proposedValue === 0)
                    yield CancelPropagationEffect.new();
                return (proposedValue !== undefined ? proposedValue : this.value);
            }
        }));
        const box2 = graph.addNode(MinimalChronoAtom.new({
            calculation: function* (proposedValue) {
                return (proposedValue !== undefined ? proposedValue : this.value) / (yield box1);
            }
        }));
        box1.put(2);
        box2.put(4);
        await graph.propagate();
        t.is(box1.get(), 2, "Correct result calculated");
        t.is(box2.get(), 2, "Correct result calculated");
        // this propagation should be canceled
        box1.put(0);
        box2.put(3);
        await graph.propagate();
        t.is(box1.get(), 2, "Correct result calculated");
        t.is(box2.get(), 2, "Correct result calculated");
    });
    t.it('Should allow to restart the propagation', async (t) => {
        const graph = MinimalChronoGraph.new();
        const box1 = graph.addNode(MinimalChronoAtom.new({
            calculation: function* (proposedValue) {
                if (proposedValue === 0) {
                    this.put(1);
                    yield RestartPropagationEffect.new();
                }
                return (proposedValue !== undefined ? proposedValue : this.value);
            }
        }));
        const box2 = graph.addNode(MinimalChronoAtom.new({
            calculation: function* (proposedValue) {
                return (proposedValue !== undefined ? proposedValue : this.value) / (yield box1);
            }
        }));
        box1.put(2);
        box2.put(4);
        await graph.propagate();
        t.is(box1.get(), 2, "Correct result calculated");
        t.is(box2.get(), 2, "Correct result calculated");
        // this propagation should be restarted with box1.put(1)
        box1.put(0);
        box2.put(3);
        await graph.propagate();
        t.is(box1.get(), 1, "Correct result calculated");
        t.is(box2.get(), 3, "Correct result calculated");
    });
});
