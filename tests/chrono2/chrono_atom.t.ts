import { ChronoBox, ChronoBoxAtomC } from "../../src/chrono2/ChronoBox.js"

declare const StartTest : any

StartTest(t => {

    t.it('Newly created ChronoBoxAtom should be initialized to `null`', t => {
        const chronoBoxAtom     = new ChronoBox()

        t.isStrict(chronoBoxAtom.read(), null)
    })


    t.it('Should read your own writes', t => {
        const chronoBoxAtom     = new ChronoBox<number>()

        chronoBoxAtom.write(10)

        t.is(chronoBoxAtom.read(), 10)

        chronoBoxAtom.write(11)
        chronoBoxAtom.write(12)

        t.is(chronoBoxAtom.read(), 12)
    })


    t.it('Writing `undefined` should be converted to `null`', t => {
        const chronoBoxAtom     = new ChronoBox<number>()

        chronoBoxAtom.write(undefined)

        t.isStrict(chronoBoxAtom.read(), null)
    })


    t.it('Reject before the very first commit should clear the atom to `null`', t => {
        const chronoBoxAtom     = new ChronoBox<number>()

        chronoBoxAtom.write(10)

        t.isStrict(chronoBoxAtom.read(), 10)

        chronoBoxAtom.reject()

        t.isStrict(chronoBoxAtom.read(), null)
    })


    t.it('Should be able undo after commit', t => {
        const chronoBoxAtom     = new ChronoBox<number>()

        chronoBoxAtom.write(10)

        t.isStrict(chronoBoxAtom.read(), 10)

        chronoBoxAtom.commit()

        chronoBoxAtom.write(11)
        chronoBoxAtom.write(12)

        chronoBoxAtom.undo()

        t.isStrict(chronoBoxAtom.read(), 10)
    })


    // t.it('Should be possible to calculate the value of the box', t => {
    //     const chronoBoxAtom     = ChronoBoxAtomC({
    //         calculation : () => 11
    //     })
    //
    //     chronoBoxAtom.write(undefined)
    //
    //     t.isStrict(chronoBoxAtom.read(), null)
    // })

})
