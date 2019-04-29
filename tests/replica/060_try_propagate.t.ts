import { PropagationResult } from "../../src/chrono/Graph.js";
import { Base } from "../../src/class/Mixin.js";
import { calculate, Entity, field } from "../../src/replica/Entity.js";
import { MinimalReplica } from "../../src/replica/Replica.js";

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

        const a = A3.new()

        let a3value = undefined
        let result  = await graph.tryPropagateWithEntities(null, [a], () => {
            a3value = a.a3
        })

        t.is(graph.getNodes().size, 0, "No nodes left in graph after propagation try")
        t.is(result, PropagationResult.Passed, "Propagation result is Passed")
        t.is(a.a3, undefined, "Consistent a3 value is undefined")
        t.is(a3value, 3, "Hatched a3 value is correct")
    })

    t.it("Dry run shouldn't affect nodes which are already in the graph", async t => {

        const graph = MinimalReplica.new();

        class A12 extends Entity(Base) {
            @field()
            a1 : number

            @field()
            a2 : number


            @calculate('a1')
            * calculateA1() {
                return 1
            }

            @calculate('a2')
            * calculateA2() {
                return 2
            }

        }

        class A3 extends Entity(Base) {
            @field()
            a3 : number

            a12 : A12

            @calculate('a3')
            * calclateA3() {
                return (yield this.a12.$.a1) + (yield this.a12.$.a2)
            }
        }

        const a12 = A12.new(),
              a3  = A3.new({ a12 : a12 })

        graph.addEntity(a12)

        const initialNodeCount = graph.getNodes().size

        let a3value = undefined
        let result  = await graph.tryPropagateWithEntities(null, [a3], () => {
            a3value = a3.a3
        })

        t.is(graph.getNodes().size, initialNodeCount, "Graph nodes are untouched after dry run")
        t.is(a12.getGraph(), graph, 'Entity A12 is left in the graph')
        t.is(result, PropagationResult.Passed, "Propagation result is Passed")
        t.is(a3.a3, undefined, "Consistent a3 value is undefined")
        t.is(a3value, 3, "Hatched a3 value is correct")
        t.isNot(a3.getGraph(), graph, "Entity A3 is not in the graph")
    })
})
