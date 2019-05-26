var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { PropagationResult } from "../../src/chrono/Graph.js";
import { Base } from "../../src/class/Mixin.js";
import { calculate, Entity, field } from "../../src/replica/Entity.js";
import { MinimalReplica } from "../../src/replica/Replica.js";
StartTest(t => {
    t.it("It should be possible to dry run graph propagation with entities", async (t) => {
        const graph = MinimalReplica.new();
        class A3 extends Entity(Base) {
            *calculateA1() {
                return 1;
            }
            *calculateA2() {
                return 2;
            }
            *calclateA3() {
                return (yield this.$.a1) + (yield this.$.a2);
            }
        }
        __decorate([
            field()
        ], A3.prototype, "a1", void 0);
        __decorate([
            field()
        ], A3.prototype, "a2", void 0);
        __decorate([
            field()
        ], A3.prototype, "a3", void 0);
        __decorate([
            calculate('a1')
        ], A3.prototype, "calculateA1", null);
        __decorate([
            calculate('a2')
        ], A3.prototype, "calculateA2", null);
        __decorate([
            calculate('a3')
        ], A3.prototype, "calclateA3", null);
        const a = A3.new();
        let a3value = undefined;
        let result = await graph.tryPropagateWithEntities(null, [a], () => {
            a3value = a.a3;
        });
        t.is(graph.getNodes().size, 0, "No nodes left in graph after propagation try");
        t.is(result, PropagationResult.Completed, "Propagation result is Completed");
        t.is(a.a3, undefined, "Consistent a3 value is undefined");
        t.is(a3value, 3, "Hatched a3 value is correct");
    });
    t.it("Dry run shouldn't affect nodes which are already in the graph", async (t) => {
        const graph = MinimalReplica.new();
        class A12 extends Entity(Base) {
            *calculateA1() {
                return 1;
            }
            *calculateA2() {
                return 2;
            }
        }
        __decorate([
            field()
        ], A12.prototype, "a1", void 0);
        __decorate([
            field()
        ], A12.prototype, "a2", void 0);
        __decorate([
            calculate('a1')
        ], A12.prototype, "calculateA1", null);
        __decorate([
            calculate('a2')
        ], A12.prototype, "calculateA2", null);
        class A3 extends Entity(Base) {
            *calclateA3() {
                return (yield this.a12.$.a1) + (yield this.a12.$.a2);
            }
        }
        __decorate([
            field()
        ], A3.prototype, "a3", void 0);
        __decorate([
            calculate('a3')
        ], A3.prototype, "calclateA3", null);
        const a12 = A12.new(), a3 = A3.new({ a12: a12 });
        graph.addEntity(a12);
        const initialNodeCount = graph.getNodes().size;
        let a3value = undefined;
        let result = await graph.tryPropagateWithEntities(null, [a3], () => {
            a3value = a3.a3;
        });
        t.is(graph.getNodes().size, initialNodeCount, "Graph nodes are untouched after dry run");
        t.is(a12.getGraph(), graph, 'Entity A12 is left in the graph');
        t.is(result, PropagationResult.Completed, "Propagation result is Completed");
        t.is(a3.a3, undefined, "Consistent a3 value is undefined");
        t.is(a3value, 3, "Hatched a3 value is correct");
        t.isNot(a3.getGraph(), graph, "Entity A3 is not in the graph");
    });
});
