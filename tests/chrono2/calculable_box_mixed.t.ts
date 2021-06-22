import { setCompactCounter } from "../../src/chrono2/atom/Node.js"
import { Box } from "../../src/chrono2/data/Box.js"
import { CalculableBox } from "../../src/chrono2/data/CalculableBox.js"
import { CalculableBoxGen } from "../../src/chrono2/data/CalculableBoxGen.js"

declare const StartTest : any

setCompactCounter(1)

StartTest(t => {

    t.it('Should support mixed calculation', async t => {
        const box1     = Box.new(10)

        const box2     = CalculableBoxGen.new<number>({
            * calculation () {
                return (yield box1) + 1
            }
        })

        const box3     = CalculableBox.new({
            calculation () {
                return box2.read() + 1
            }
        })

        const box4     = CalculableBoxGen.new<number>({
            * calculation () {
                return (yield box3) + 1
            }
        })

        const box5     = CalculableBox.new({
            calculation () {
                return box4.read() + 1
            }
        })

        const boxes     = [ box1, box2, box3, box4, box5 ]

        t.isDeeply(boxes.map(box => box.read()), [ 10, 11, 12, 13, 14 ])

        box1.write(20)

        t.isDeeply(boxes.map(box => box.read()), [ 20, 21, 22, 23, 24 ])
    })
})
