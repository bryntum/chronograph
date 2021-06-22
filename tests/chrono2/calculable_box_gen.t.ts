import { setCompactCounter } from "../../src/chrono2/atom/Node.js"
import { CalculationIterator } from "../../src/chrono2/CalculationMode.js"
import { Box } from "../../src/chrono2/data/Box.js"
import { CalculableBoxGen } from "../../src/chrono2/data/CalculableBoxGen.js"

declare const StartTest : any

setCompactCounter(1)

StartTest(t => {

    t.it('Should support the synchronous "reactive" stack depth of 20000 (meaning virtually unlimited)', t => {
        const stackSize = 20000

        const boxes : Box<number>[]      = [ Box.new(0) ]

        for (let i = 0; i < stackSize; i++) {
            boxes.push(CalculableBoxGen.new({
                context     : boxes.length,
                * calculation (this : number) : CalculationIterator<number> {
                    return (yield boxes[ this - 1 ]) + 1
                }
            }))
        }

        const lastBox       = boxes[ boxes.length - 1 ]

        t.is(lastBox.read(), stackSize)

        boxes[ 0 ].write(1)

        t.is(lastBox.read(), stackSize + 1)
    })
})
