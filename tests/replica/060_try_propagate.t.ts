import { PropagationResult } from "../../src/chrono/Graph.js";
import { MinimalReplica } from "../../src/replica/Replica.js";
import { Entity, calculate, field } from "../../src/replica/Entity.js";
import { Base } from "../../src/class/Mixin.js";

declare const StartTest : any

StartTest(t => {

    t.it("It should be possible to dry run graph propagation with entities", async t => {

        const graph = MinimalReplica.new();

        class A3 extends Entity(Base) {
            @field()
            a1 : number

            @field()
            a2 : number

            @field()
            a3 : number

            @calculate('a1')
            * calculateA1() {
                return 1
            }

            @calculate('a2')
            * calculateA2() {
                return 2
            }

            @calculate('a3')
            * calclateA3() {
                return (yield this.$.a1) + (yield this.$.a2)
            }
        }

        const a = A3.new();

        let a3value = undefined
        let result  = await graph.tryPropagateWithEntities(null, [a], () => {
            a3value = a.a3
        })

        t.is(graph.getNodes().size, 0, "No nodes left in graph after propagation try")
        t.is(result, PropagationResult.Passed, "Propagation result is Passed")
        t.is(a.a3, undefined, "Consistent a3 value is undefined")
        t.is(a3value, 3, "Hatched a3 value is correct")
    })
})
