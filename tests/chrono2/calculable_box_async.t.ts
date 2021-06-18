import { setCompactCounter } from "../../src/chrono2/atom/Node.js"
import { CalculationIterator } from "../../src/chrono2/CalculationMode.js"
import { Box } from "../../src/chrono2/data/Box.js"
import { CalculableBoxGen } from "../../src/chrono2/data/CalculableBoxGen.js"
import { delay } from "../../src/util/Helpers.js"

declare const StartTest : any

setCompactCounter(1)

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

        t.isStrict(promise1, promise2, 'Used the same promise')

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


    t.it('Should not re-entry async gen calculations that has been partially read already, random timings, stressed', async t => {
        const boxes : CalculableBoxGen<number>[] = [ new Box(0, 'box0') as any ]

        const size      = 20

        let count : number = 0

        for (let i = 1; i <= size; i++) {
            boxes.push(new CalculableBoxGen({
                name        : 'box' + i,
                sync        : false,

                *calculation (this : number) : CalculationIterator<number> {
                    count++

                    yield randomDelay()

                    return (yield boxes[ this - 1 ]) + 1
                },
                context     : i
            }))
        }

        const lastBox       = boxes[ boxes.length - 1 ]

        const randomIndicies    = Array(size).fill(0).map((v, i) => {
            return { i, random : Math.floor(Math.random() * size) }
        })
        randomIndicies.sort((a, b) => a.random - b.random)

        // start reading from half of the boxes, randomly
        for (let i = 1; i <= size / 2; i++) {
            boxes[ randomIndicies[ i - 1 ].i + 1 ].readAsync()
        }

        t.is(await lastBox.readAsync(), size, 'Correct value')

        t.is(count, size, 'Calculated every box only once')
    })

})
