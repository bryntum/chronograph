import { setCompactCounter } from "../../src/chrono2/atom/Node.js"
import { BoxUnbound } from "../../src/chrono2/data/Box.js"
import { CalculableBoxUnbound } from "../../src/chrono2/data/CalculableBox.js"
import { ChronoGraph } from "../../src/chrono2/graph/Graph.js"
import { delay } from "../../src/util/Helpers.js"

declare const StartTest : any

setCompactCounter(1)

const randomDelay = () => delay(Math.random() * 100)

StartTest(t => {

    t.it('Should cleanup calculations that are not used', async t => {
        const graph       = ChronoGraph.new({ historyLimit : 0 })

        let box2CleanedUp       = false

        const box2      = CalculableBoxUnbound.new({
            lazy        : false,
            name        : 'box2',

            calculation () : number {
                return 2
            },

            cleanup () { box2CleanedUp = true }
        })


        let box3CleanedUp       = false

        const box3      = CalculableBoxUnbound.new({
            lazy        : false,
            name        : 'box3',
            persistent  : false,

            calculation () : number {
                return 3
            },

            cleanup () { debugger; box3CleanedUp = true }
        })

        const ref       = BoxUnbound.new(box2, 'refBox')

        const box4      = CalculableBoxUnbound.new({
            lazy        : false,
            name        : 'box4',

            calculation () : number {
                return ref.read().read()
            }
        })

        graph.addAtoms([ box2, box3, ref, box4 ])

        graph.commit()

        t.is(box2CleanedUp, false)
        t.is(box3CleanedUp, true)

        box3CleanedUp = false

        graph.commit()

        t.is(box2CleanedUp, false)
        t.is(box3CleanedUp, false)

        t.is(box3.graph, undefined)
    })
})
