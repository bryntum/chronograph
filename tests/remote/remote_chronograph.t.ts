import { serializable, stringify, parse } from "typescript-serializable-mixin/index.js"
import { SerializationScope } from "typescript-serializable-mixin/src/serializable/Serializable.js"
import { setCompactCounter } from "../../src/chrono2/atom/Node.js"
import { BoxUnbound } from "../../src/chrono2/data/Box.js"
import { CalculableBoxUnbound } from "../../src/chrono2/data/CalculableBox.js"
import { ChronoGraph } from "../../src/chrono2/graph/Graph.js"

declare const StartTest : any

setCompactCounter(1)

StartTest(t => {

    t.it('Should trigger auto-commit', async t => {
        const box1      = BoxUnbound.new(10)

        const box2      = CalculableBoxUnbound.new({
            lazy        : false,
            calculation () : number {
                return box1.read() + 1
            }
        })

        const graph     = ChronoGraph.new({ autoCommit : true, historyLimit : 0 })

        graph.addAtoms([ box1, box2 ])

        graph.commit()

        const scope                     = SerializationScope.new()

        const serialized                = scope.stringify(graph)
        const revived : ChronoGraph     = scope.parse(serialized)

        const box1Remote                = scope.parse(scope.stringify(box1))
        const box2Remote                = scope.parse(scope.stringify(box2))

        t.is(box1Remote.read(), 10)
        t.is(box2Remote.read(), 11)
    })
})
