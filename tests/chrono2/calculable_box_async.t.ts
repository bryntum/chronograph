import { CalculationIterator } from "../../src/chrono2/CalculationMode.js"
import { Box } from "../../src/chrono2/data/Box.js"
import { CalculableBoxGen } from "../../src/chrono2/data/CalculableBoxGen.js"
import { delay } from "../../src/util/Helpers.js"

declare const StartTest : any

const randomDelay = () => delay(Math.random() * 100)

StartTest(t => {

    t.it('Should not re-entry async read', async t => {
        const var1      = new Box(1, 'v1')

        let count       = 0

        const iden1     = new CalculableBoxGen({
            sync        : false,

            *calculation () : CalculationIterator<number> {
                count++

                yield randomDelay()

                return (yield var1) + 1
            }
        })

        const promise1      = iden1.readAsync()
        const promise2      = iden1.readAsync()

        t.is(await promise1, 2, 'Correct value')
        t.is(await promise2, 2, 'Correct value')

        t.is(count, 1, 'Calculated once')
    })


    t.it('Should not re-entry async gen calculations that has been partially read already, random timings', async t => {
        const box0      = new Box(1, 'box0')

        let count : number = 0

        const box1      = new CalculableBoxGen({
            name        : 'box1',
            sync        : false,

            *calculation () : CalculationIterator<number> {
                count++

                yield randomDelay()

                return (yield box0) + 1
            }
        })

        const box2     = new CalculableBoxGen({
            name        : 'box2',
            sync        : false,

            *calculation () : CalculationIterator<number> {
                count++

                yield randomDelay()

                return (yield box1) + 1
            }
        })

        const box3     = new CalculableBoxGen({
            name        : 'box3',
            sync        : false,

            *calculation () : CalculationIterator<number> {
                count++

                yield randomDelay()

                return (yield box2) + 1
            }
        })

        // starts the calculation of `box2`
        const promise1      = box2.readAsync()

        // reads the value of `box3`
        t.is(await box3.readAsync(), 4, 'Correct value')

        t.is(await promise1, 3, 'Correct value')

        t.is(count, 3, 'Calculated every box only once')
    })
})
