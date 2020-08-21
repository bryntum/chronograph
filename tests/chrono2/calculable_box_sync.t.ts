import { setCompactCounter } from "../../src/chrono2/atom/Node.js"
import { Box } from "../../src/chrono2/data/Box.js"
import { CalculableBox } from "../../src/chrono2/data/CalculableBox.js"

declare const StartTest : any

setCompactCounter(1)

StartTest(t => {

    t.it('Should support the synchronous "reactive" stack depth of 2500', t => {
        const stackSize = 2500

        const boxes : Box<number>[]      = [ new Box(0) ]

        for (let i = 0; i < stackSize; i++) {
            boxes.push(new CalculableBox({
                context     : boxes.length,
                calculation () : number {
                    return boxes[ this - 1 ].read() + 1
                }
            }))
        }

        const lastBox       = boxes[ boxes.length - 1 ]

        t.is(lastBox.read(), stackSize)

        boxes[ 0 ].write(1)

        t.is(lastBox.read(), stackSize + 1)
    })
})
