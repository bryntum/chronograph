import { setCompactCounter } from "../../src/chrono2/atom/Node.js"
import { Box } from "../../src/chrono2/data/Box.js"

declare const StartTest : any

setCompactCounter(1)

StartTest(t => {

    t.it('Newly created Box should return `null` on read', t => {
        const box     = new Box()

        t.isStrict(box.read(), null)
    })


    t.it('Should be possible to provide value as constructor argument', t => {
        const box     = new Box(10)

        t.isStrict(box.read(), 10)
    })


    t.it('Should read your own writes', t => {
        const box     = new Box()

        box.write(10)

        t.is(box.read(), 10)

        box.write(11)
        box.write(12)

        t.is(box.read(), 12)
    })


    t.it('Writing `undefined` should be converted to `null`', t => {
        const box     = new Box()

        box.write(10)

        t.is(box.read(), 10)

        box.write(undefined)

        t.isStrict(box.read(), null)
    })
})
