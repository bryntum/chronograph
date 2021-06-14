import { setCompactCounter } from "../../src/chrono2/atom/Node.js"
import { ChronoGraph } from "../../src/chrono2/graph/Graph.js"
import { delay } from "../../src/util/Helpers.js"

declare const StartTest : any

setCompactCounter(1)

const randomDelay = () => delay(Math.random() * 100)

const globalGraph       = ChronoGraph.new({ historyLimit : 0 })
const api               = globalGraph.api()

StartTest(t => {

    t.it('Should trigger auto-commit', async t => {
        let box2CleanedUp       = false

        const box2      = new api.RCalculableBox({
            lazy        : false,

            calculation () : number {
                return 2
            },

            cleanup () { box2CleanedUp = true }
        })


        let box3CleanedUp       = false

        const box3      = new api.RCalculableBox({
            lazy        : false,

            calculation () : number {
                return 3
            },

            cleanup () { box3CleanedUp = true }
        })

        const ref       = new api.RBox(box2)

        const box4      = new api.RCalculableBox({
            lazy        : false,

            calculation () : number {
                return ref.read().read()
            }
        })

        globalGraph.commit()
        globalGraph.commit()

        t.is(box2CleanedUp, false)
        t.is(box3CleanedUp, true)
    })
})
