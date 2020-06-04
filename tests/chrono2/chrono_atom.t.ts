import { Box } from "../../src/chrono2/data/Box.js"
import { CalculableBox } from "../../src/chrono2/data/CalculableBox.js"

declare const StartTest : any

StartTest(t => {

    t.it('Newly created ChronoBoxAtom should return `null` on read', t => {
        const box     = new Box()

        t.isStrict(box.read(), null)
    })


    t.it('Should read your own writes', t => {
        const box     = new Box<number>()

        box.write(10)

        t.is(box.read(), 10)

        box.write(11)
        box.write(12)

        t.is(box.read(), 12)
    })


    t.it('Writing `undefined` should be converted to `null`', t => {
        const box     = new Box<number>()

        box.write(10)

        t.is(box.read(), 10)

        box.write(undefined)

        t.isStrict(box.read(), null)
    })


    t.it('Should be possible to calculate the value of the box', t => {
        const context = {}

        const box     = new CalculableBox<number>({
            calculation : function () {
                t.is(this, context, 'Correct context')
                return 11
            },
            context
        })

        t.is(box.read(), 11)
    })

})
